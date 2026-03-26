#!/usr/bin/env node
/**
 * Hacker News -> DeepSeek -> WeChat MP rich text (HTML).
 * Single entry: API client + pipeline + CLI.
 *
 *   pnpm hn:weixin-mp
 *   pnpm hn:weixin-mp -- --dry-run
 *   pnpm hn:spider   — Algolia + Firebase only (no DeepSeek / no WeChat files)
 *   pnpm hn:weixin-digest — 抓取 N 篇正文（HN 文本或外链 HTML）→ DeepSeek 合成一篇公众号稿
 *
 * Env:
 *   HN_WEIXIN_ARTICLE_COUNT — default 1. When >1, scans more Algolia pages and writes
 *   output/tts/weixin-mp-articles.json (array) plus per-article HTML files.
 *   HN_SPIDER_MAX_STORIES — optional cap for hn:spider (overrides spiderMaxStories in config).
 *   HN_SPIDER_FETCH_COMMENTS — set to 1 to load top comments (slow); default skips comments for speed.
 *   HN_DIGEST_STORY_COUNT — override digestStoryCount (2–20).
 *   HN_DIGEST_IGNORE_PROCESSED — set to 1 to allow reusing already-processed story ids in digest pool.
 *
 * Config: hn-config.json (paths, Algolia 7-day hot pool, frameworkKeywords).
 * Output: single-article mode — weixin-mp-article.json (+ .html).
 */

import OpenAI from 'openai';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Hacker News API (Firebase) -------------------------------------------------

export const HN_FIREBASE_BASE = 'https://hacker-news.firebaseio.com/v0';

export type HNStoryListKind = 'top' | 'best';

export interface HNItem {
  id: number;
  type?: string;
  deleted?: boolean;
  dead?: boolean;
  by?: string;
  time?: number;
  title?: string;
  url?: string;
  text?: string;
  kids?: number[];
  score?: number;
  descendants?: number;
  parent?: number;
  parts?: number[];
  poll?: number;
}

export interface HackerNewsClientOptions {
  minIntervalMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  baseUrl?: string;
}

const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

export class HackerNewsClient {
  private readonly baseUrl: string;
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private nextAllowedAt = 0;

  constructor(options: HackerNewsClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? HN_FIREBASE_BASE).replace(/\/$/, '');
    this.minIntervalMs = options.minIntervalMs ?? 120;
    this.maxRetries = Math.max(1, options.maxRetries ?? 3);
    this.retryBackoffMs = options.retryBackoffMs ?? 400;
  }

  async fetchStoryIdList(kind: HNStoryListKind): Promise<number[]> {
    const path = `${kind}stories.json`;
    const data = await this.requestJson<unknown>(path);
    if (!Array.isArray(data) || !data.every((x) => typeof x === 'number')) {
      throw new Error(`HN ${path}: expected number[], got invalid JSON`);
    }
    return data as number[];
  }

  async fetchItem(id: number): Promise<HNItem | null> {
    const data = await this.requestJson<HNItem | null>(`item/${id}.json`);
    if (data === null) {
      return null;
    }
    if (typeof data !== 'object' || typeof data.id !== 'number') {
      throw new Error(`HN item/${id}.json: unexpected shape`);
    }
    return data;
  }

  async fetchItemsSequential(ids: number[]): Promise<HNItem[]> {
    const out: HNItem[] = [];
    for (const id of ids) {
      const item = await this.fetchItem(id);
      if (item) {
        out.push(item);
      }
    }
    return out;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const wait = this.nextAllowedAt - now;
    if (wait > 0) {
      await sleep(wait);
    }
    this.nextAllowedAt = Date.now() + this.minIntervalMs;
  }

  private async requestJson<T>(relativePath: string): Promise<T> {
    const url = `${this.baseUrl}/${relativePath}`;
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      await this.throttle();
      try {
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`HN HTTP ${res.status} for ${relativePath}`);
        }
        return (await res.json()) as T;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await sleep(this.retryBackoffMs * attempt);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError));
  }
}

export const hn = new HackerNewsClient();

// --- Algolia HN Search (time window + sort by points) ---------------------------

const HN_ALGOLIA_SEARCH = 'https://hn.algolia.com/api/v1/search';

interface AlgoliaStoryHit {
  objectID?: string;
  points?: number;
}

interface AlgoliaSearchResponse {
  hits?: AlgoliaStoryHit[];
  nbPages?: number;
}

/**
 * Stories from the last `lookbackDays` (Algolia index), sorted by points desc,
 * returning up to `pickCount` distinct story ids. Fetches up to `poolHits` hits
 * in one request (Algolia cap 100 per page).
 */
async function fetchHotStoryIdsFromAlgolia(
  lookbackDays: number,
  poolHits: number,
  pickCount: number,
): Promise<number[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = nowSec - lookbackDays * 24 * 3600;
  const hitsPerPage = Math.min(100, Math.max(poolHits, pickCount));

  const params = new URLSearchParams({
    tags: 'story',
    numericFilters: `created_at_i>${cutoff}`,
    hitsPerPage: String(hitsPerPage),
  });
  const url = `${HN_ALGOLIA_SEARCH}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HN Algolia search HTTP ${res.status}`);
  }
  const data = (await res.json()) as AlgoliaSearchResponse;
  const hits = data.hits ?? [];
  const sorted = [...hits].sort(
    (a, b) => (b.points ?? 0) - (a.points ?? 0),
  );

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const h of sorted) {
    const id = Number(h.objectID);
    if (!Number.isFinite(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
    if (ids.length >= pickCount) {
      break;
    }
  }
  return ids;
}

/**
 * Walk Algolia pages (same 7-day filter), merge hits, sort by points desc, dedupe ids.
 * Caps at maxPages requests (100 hits each).
 */
async function fetchHotStoryIdsFromAlgoliaAllPages(
  lookbackDays: number,
  hitsPerPage: number,
  maxPages: number,
): Promise<number[]> {
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoff = nowSec - lookbackDays * 24 * 3600;
  const perPage = Math.min(100, Math.max(1, hitsPerPage));
  const allHits: AlgoliaStoryHit[] = [];

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      tags: 'story',
      numericFilters: `created_at_i>${cutoff}`,
      hitsPerPage: String(perPage),
      page: String(page),
    });
    const url = `${HN_ALGOLIA_SEARCH}?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HN Algolia search HTTP ${res.status} (page ${page})`);
    }
    const data = (await res.json()) as AlgoliaSearchResponse;
    const hits = data.hits ?? [];
    allHits.push(...hits);
    if (hits.length < perPage) {
      break;
    }
    if (typeof data.nbPages === 'number' && page >= data.nbPages - 1) {
      break;
    }
  }

  const sorted = [...allHits].sort(
    (a, b) => (b.points ?? 0) - (a.points ?? 0),
  );
  const out: number[] = [];
  const seen = new Set<number>();
  for (const h of sorted) {
    const id = Number(h.objectID);
    if (!Number.isFinite(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

const ALGOLIA_BATCH_MAX_PAGES = 10;

const HN_WEIXIN_ARTICLE_MAX = 50;

function resolveArticleCount(
  options: { articleCount?: number },
): number {
  if (options.articleCount !== undefined) {
    const n = options.articleCount;
    if (!Number.isFinite(n) || n < 1) {
      return 1;
    }
    return Math.min(HN_WEIXIN_ARTICLE_MAX, Math.floor(n));
  }
  const raw = process.env.HN_WEIXIN_ARTICLE_COUNT;
  if (raw === undefined || raw.trim() === '') {
    return 1;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(HN_WEIXIN_ARTICLE_MAX, n);
}

// --- Pipeline -------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

interface HnConfigFile {
  minScore: number;
  /** Sliding window for "recent" stories (Algolia filter + Firebase item age). */
  lookbackDays: number;
  /** How many hits to request from Algolia before sorting by points (max 100). */
  algoliaPoolHits: number;
  /** Take this many hottest stories by points from the pool. */
  hotStoryPickCount: number;
  commentFetchLimit: number;
  author: string;
  outputJsonRelative: string;
  outputHtmlRelative: string;
  processedIdsRelative: string;
  errorsDirRelative: string;
  /** Snapshot path for hn:spider (--spider-only). */
  spiderOutputRelative: string;
  /** Max eligible stories to write into the spider snapshot. */
  spiderMaxStories: number;
  /** How many stories to fetch body + merge in --digest mode. */
  digestStoryCount: number;
  /** Max plain-text chars per story body sent to the model. */
  digestBodyMaxCharsPerStory: number;
  digestFetchTimeoutMs: number;
  /** Delay between external URL fetches (politeness). */
  digestUrlFetchIntervalMs: number;
  frameworkKeywords: string[];
}

export interface HnStoryMaterial {
  id: number;
  title: string;
  url: string | null;
  hnUrl: string;
  score: number;
  time: number;
  by?: string;
  topComments: string[];
}

function loadConfig(): HnConfigFile {
  const path = join(__dirname, 'hn-config.json');
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('hn-config.json: invalid root');
  }
  const c = raw as Record<string, unknown>;
  const kw = c.frameworkKeywords;
  if (!Array.isArray(kw) || !kw.every((x) => typeof x === 'string')) {
    throw new Error('hn-config.json: frameworkKeywords must be string[]');
  }
  const lookbackDays = c.lookbackDays;
  const algoliaPoolHits = c.algoliaPoolHits;
  const hotStoryPickCount = c.hotStoryPickCount;
  if (typeof lookbackDays !== 'number' || lookbackDays < 1) {
    throw new Error('hn-config.json: lookbackDays must be a number >= 1');
  }
  if (typeof algoliaPoolHits !== 'number' || algoliaPoolHits < 1) {
    throw new Error('hn-config.json: algoliaPoolHits must be a number >= 1');
  }
  if (typeof hotStoryPickCount !== 'number' || hotStoryPickCount < 1) {
    throw new Error('hn-config.json: hotStoryPickCount must be a number >= 1');
  }
  const spiderOutputRelative = c.spiderOutputRelative;
  const spiderMaxStories = c.spiderMaxStories;
  if (typeof spiderOutputRelative !== 'string' || !spiderOutputRelative) {
    throw new Error('hn-config.json: spiderOutputRelative must be a non-empty string');
  }
  if (typeof spiderMaxStories !== 'number' || spiderMaxStories < 1) {
    throw new Error('hn-config.json: spiderMaxStories must be a number >= 1');
  }
  const digestStoryCount = c.digestStoryCount;
  const digestBodyMaxCharsPerStory = c.digestBodyMaxCharsPerStory;
  const digestFetchTimeoutMs = c.digestFetchTimeoutMs;
  const digestUrlFetchIntervalMs = c.digestUrlFetchIntervalMs;
  if (typeof digestStoryCount !== 'number' || digestStoryCount < 2) {
    throw new Error('hn-config.json: digestStoryCount must be a number >= 2');
  }
  if (
    typeof digestBodyMaxCharsPerStory !== 'number' ||
    digestBodyMaxCharsPerStory < 500
  ) {
    throw new Error(
      'hn-config.json: digestBodyMaxCharsPerStory must be a number >= 500',
    );
  }
  if (typeof digestFetchTimeoutMs !== 'number' || digestFetchTimeoutMs < 3000) {
    throw new Error(
      'hn-config.json: digestFetchTimeoutMs must be a number >= 3000',
    );
  }
  if (
    typeof digestUrlFetchIntervalMs !== 'number' ||
    digestUrlFetchIntervalMs < 0
  ) {
    throw new Error(
      'hn-config.json: digestUrlFetchIntervalMs must be a number >= 0',
    );
  }
  return raw as HnConfigFile;
}

function loadDeepseekApiKeyFromEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('DEEPSEEK_API_KEY=')) {
        process.env.DEEPSEEK_API_KEY = line.split('=')[1]?.trim() ?? '';
        break;
      }
    }
  } catch {
    // use system env
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function matchesFramework(
  title: string | undefined,
  url: string | undefined,
  keywords: string[],
): boolean {
  const t = (title ?? '').toLowerCase();
  let host = '';
  if (url) {
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      host = '';
    }
  }
  for (const k of keywords) {
    const kw = k.toLowerCase();
    if (t.includes(kw) || host.includes(kw)) {
      return true;
    }
  }
  return false;
}

function storyAgeSeconds(item: HNItem): number {
  const t = item.time ?? 0;
  return Math.floor(Date.now() / 1000) - t;
}

function isEligibleStory(
  item: HNItem,
  cfg: HnConfigFile,
  keywords: string[],
): boolean {
  if (item.deleted || item.dead) {
    return false;
  }
  if (item.type !== 'story') {
    return false;
  }
  const score = item.score ?? 0;
  if (score < cfg.minScore) {
    return false;
  }
  const maxSec = cfg.lookbackDays * 24 * 3600;
  if (storyAgeSeconds(item) > maxSec) {
    return false;
  }
  return matchesFramework(item.title, item.url, keywords);
}

async function fetchTopComments(
  client: HackerNewsClient,
  item: HNItem,
  limit: number,
): Promise<string[]> {
  const kids = item.kids ?? [];
  const texts: string[] = [];
  for (const kidId of kids.slice(0, limit)) {
    const c = await client.fetchItem(kidId);
    if (!c || c.type !== 'comment' || !c.text) {
      continue;
    }
    const plain = decodeHtmlEntities(c.text).replace(/<[^>]+>/g, ' ').trim();
    if (plain) {
      texts.push(plain);
    }
  }
  return texts;
}

function toMaterial(item: HNItem, topComments: string[]): HnStoryMaterial {
  return {
    id: item.id,
    title: item.title ?? '',
    url: item.url ?? null,
    hnUrl: `https://news.ycombinator.com/item?id=${item.id}`,
    score: item.score ?? 0,
    time: item.time ?? 0,
    by: item.by,
    topComments,
  };
}

export type HnBodySource =
  | 'hn_self'
  | 'url'
  | 'empty'
  | 'blocked'
  | 'not_html'
  | 'fetch_error';

export interface HnDigestStoryMaterial extends HnStoryMaterial {
  bodyText: string;
  bodySource: HnBodySource;
}

function stripHtmlToPlain(html: string, maxLen: number): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const decoded = decodeHtmlEntities(stripped);
  if (decoded.length <= maxLen) {
    return decoded;
  }
  return `${decoded.slice(0, maxLen)}\n\n[正文已截断]`;
}

function isForbiddenFetchHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) {
    return true;
  }
  if (h === '0.0.0.0' || h === '::1' || h === '[::1]') {
    return true;
  }
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) {
      return true;
    }
    if (a === 127) {
      return true;
    }
    if (a === 0) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
  }
  return false;
}

function isAllowedArticleUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }
    return !isForbiddenFetchHost(u.hostname);
  } catch {
    return false;
  }
}

async function fetchExternalArticlePlainText(
  url: string,
  maxLen: number,
  timeoutMs: number,
): Promise<{ source: HnBodySource; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; HNDigestBot/1.0; +https://news.ycombinator.com)',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      return {
        source: 'fetch_error',
        text: `[HTTP ${res.status} 无法抓取正文]`,
      };
    }
    const ctype = (res.headers.get('content-type') ?? '').toLowerCase();
    const raw = await res.text();
    if (ctype.includes('text/html') || ctype.includes('application/xhtml')) {
      const plain = stripHtmlToPlain(raw, maxLen);
      return {
        source: 'url',
        text: plain || '[页面无可见文本]',
      };
    }
    if (ctype.includes('text/plain')) {
      const t = decodeHtmlEntities(raw.replace(/\s+/g, ' ').trim());
      return {
        source: 'url',
        text:
          t.length <= maxLen
            ? t
            : `${t.slice(0, maxLen)}\n\n[正文已截断]`,
      };
    }
    return {
      source: 'not_html',
      text: `[非 HTML 正文，Content-Type: ${ctype || 'unknown'}]`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      source: 'fetch_error',
      text: `[抓取异常: ${msg}]`,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function resolveDigestBodyForItem(
  item: HNItem,
  cfg: HnConfigFile,
): Promise<{ bodyText: string; bodySource: HnBodySource }> {
  const maxLen = cfg.digestBodyMaxCharsPerStory;
  const hnText = (item.text ?? '').trim();
  if (hnText.length > 0) {
    return {
      bodyText: stripHtmlToPlain(hnText, maxLen),
      bodySource: 'hn_self',
    };
  }
  const url = item.url?.trim() ?? '';
  if (!url) {
    return { bodyText: '[无外链且无 HN 正文]', bodySource: 'empty' };
  }
  if (!isAllowedArticleUrl(url)) {
    return { bodyText: '[URL 不允许抓取]', bodySource: 'blocked' };
  }
  const r = await fetchExternalArticlePlainText(
    url,
    maxLen,
    cfg.digestFetchTimeoutMs,
  );
  return { bodyText: r.text, bodySource: r.source };
}

async function loadProcessedIds(filePath: string): Promise<Set<number>> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      return new Set();
    }
    return new Set(data.filter((x) => typeof x === 'number') as number[]);
  } catch {
    return new Set();
  }
}

async function saveProcessedIds(
  filePath: string,
  ids: Set<number>,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify(Array.from(ids).sort((a, b) => a - b), null, 2),
    'utf-8',
  );
}

async function generateWeixinMpRichTextFromHn(
  material: HnStoryMaterial,
  defaultAuthor: string,
  errorsDir: string,
): Promise<{ title: string; author: string; body: string }> {
  loadDeepseekApiKeyFromEnvLocal();
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error(
      'DEEPSEEK_API_KEY is not set. Set it in .env.local or environment.',
    );
  }

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const payload = JSON.stringify(material, null, 2);

  const userPrompt = `你是一个微信公众号编辑。根据下面提供的 Hacker News 帖子与评论摘要，写一篇适合在微信公众号发布的科技向解读文章。

素材说明：
- 你只能根据提供的 JSON 中的标题、链接、分数、时间与评论摘要进行写作；不要编造未出现的事实或来源。
- 若信息不足以展开某一点，请明确写「公开信息有限」或类似表述，不要臆测。

要求：
1. 标题：根据素材拟定适合公众号的标题，不要直接照抄 HN 英文标题；可提炼中文角度。
2. 文章风格：清晰、有观点、适合中文读者；可适当对比业界背景。
3. 输出格式：必须是富文本 HTML，微信公众号不支持 Markdown。
4. 只使用以下 HTML 标签：<p> 段落、<strong> 加粗、<em> 斜体、<br> 换行。不要使用 <h1>~<h6>、<ul>、<ol>、<a> 等。
5. 只输出文章正文的 HTML 片段，不要包含 <html>、<body>、<head> 等外层标签。
6. 在第一段之前加一段粗体的摘要，摘要内容为文章核心要点，必须缩短到 20 个字以内。
7. 每一段正文总字数控制在 600～1200 字，段落适中。

请按以下 JSON 格式回复（不要包含其他说明或 markdown 代码块）：
{"title":"文章标题","author":"作者名","body":"<p>第一段...</p><p>第二段...</p>"}

HN 素材（JSON）：
${payload}`;

  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content:
          'You are a WeChat Official Account editor. You must reply with a single JSON object only: {"title":"...","author":"...","body":"<p>...</p>"}. No extra text or markdown.',
      },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error('Empty response from DeepSeek');
  }

  let jsonStr = raw;
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    jsonStr = codeMatch[1].trim();
  }

  let parsed: { title?: string; author?: string; body?: string };
  try {
    parsed = JSON.parse(jsonStr) as {
      title?: string;
      author?: string;
      body?: string;
    };
  } catch {
    await mkdir(errorsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(
      join(errorsDir, `hn-deepseek-raw-${material.id}-${stamp}.txt`),
      raw,
      'utf-8',
    );
    throw new SyntaxError(
      `Invalid JSON from model (raw saved under ${errorsDir})`,
    );
  }

  const title =
    typeof parsed.title === 'string' ? parsed.title : 'HN 科技速递';
  const author = defaultAuthor;
  const body =
    typeof parsed.body === 'string'
      ? parsed.body
      : `<p>${raw.replace(/</g, '&lt;')}</p>`;

  return { title, author, body };
}

async function generateWeixinMpDigestFromHn(
  stories: HnDigestStoryMaterial[],
  defaultAuthor: string,
  errorsDir: string,
): Promise<{ title: string; author: string; body: string }> {
  loadDeepseekApiKeyFromEnvLocal();
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error(
      'DEEPSEEK_API_KEY is not set. Set it in .env.local or environment.',
    );
  }

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const payload = JSON.stringify(
    stories.map((s) => ({
      hnId: s.id,
      title: s.title,
      url: s.url,
      hnUrl: s.hnUrl,
      score: s.score,
      bodySource: s.bodySource,
      bodyText: s.bodyText,
      topComments: s.topComments,
    })),
    null,
    2,
  );

  const userPrompt = `你是一个微信公众号编辑。下面提供 ${stories.length} 篇来自 Hacker News 的科技向素材；每篇包含标题、链接、以及从 HN 正文或外链页面抽取的纯文本（可能不完整、抓取失败或非英文，以 bodySource 与正文为准）。

任务：综合全部素材，写**一篇**适合微信公众号的「多篇速递 / 综述」长文，帮助中文读者把握这几条新闻的要点与联系。

约束：
- 只依据素材中已出现的信息写作；某篇若正文缺失或仅为错误提示，可一句话带过并写「公开信息有限」，不要编造细节。
- 标题需概括多源主题，不要只复述第一篇英文标题。
- 输出富文本 HTML；仅使用：<p>、<strong>、<em>、<br>。不要用 <h1>~<h6>、列表、<a> 等。
- 只输出正文 HTML 片段，不要 <html>/<body>。
- 第一段正文**之前**加一段 <strong> 摘要，摘要不超过 20 个汉字。
- 全文建议 1800～2800 汉字，分段清晰；可适当对比或串联多条新闻。

请严格按以下 JSON 回复（不要 markdown 代码块或其它说明）：
{"title":"文章标题","author":"作者名","body":"<p>第一段...</p><p>第二段...</p>"}

多篇素材（JSON 数组的字符串化）：
${payload}`;

  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content:
          'You are a WeChat Official Account editor. Reply with a single JSON object only: {"title":"...","author":"...","body":"<p>...</p>"}. No extra text or markdown.',
      },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error('Empty response from DeepSeek');
  }

  let jsonStr = raw;
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    jsonStr = codeMatch[1].trim();
  }

  let parsed: { title?: string; author?: string; body?: string };
  try {
    parsed = JSON.parse(jsonStr) as {
      title?: string;
      author?: string;
      body?: string;
    };
  } catch {
    await mkdir(errorsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(
      join(errorsDir, `hn-deepseek-raw-digest-${stamp}.txt`),
      raw,
      'utf-8',
    );
    throw new SyntaxError(
      `Invalid JSON from model (raw saved under ${errorsDir})`,
    );
  }

  const title =
    typeof parsed.title === 'string' ? parsed.title : 'HN 多篇速递';
  const author = defaultAuthor;
  const body =
    typeof parsed.body === 'string'
      ? parsed.body
      : `<p>${raw.replace(/</g, '&lt;')}</p>`;

  return { title, author, body };
}

const DIGEST_STORY_MAX = 20;

function resolveDigestStoryCount(cfg: HnConfigFile): number {
  const raw = process.env.HN_DIGEST_STORY_COUNT;
  if (raw !== undefined && raw.trim() !== '') {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 2) {
      return Math.min(DIGEST_STORY_MAX, n);
    }
  }
  return Math.min(DIGEST_STORY_MAX, cfg.digestStoryCount);
}

function digestIgnoresProcessed(): boolean {
  return process.env.HN_DIGEST_IGNORE_PROCESSED === '1';
}

/** Fetch N story bodies + one DeepSeek merged WeChat article. */
export async function runHnWeixinDigestPipeline(
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const { dryRun = false } = options;
  const cfg = loadConfig();
  const keywords = cfg.frameworkKeywords;
  const digestN = resolveDigestStoryCount(cfg);
  const cwd = process.cwd();
  const outJson = resolve(cwd, cfg.outputJsonRelative);
  const outHtml = resolve(cwd, cfg.outputHtmlRelative);
  const outDir = dirname(outJson);
  const processedPath = resolve(cwd, cfg.processedIdsRelative);
  const errorsDir = resolve(cwd, cfg.errorsDirRelative);
  const client = hn;
  const processed = await loadProcessedIds(processedPath);
  const skipProcessed = !digestIgnoresProcessed();

  const orderedIds = await fetchHotStoryIdsFromAlgoliaAllPages(
    cfg.lookbackDays,
    cfg.algoliaPoolHits,
    ALGOLIA_BATCH_MAX_PAGES,
  );

  const picked: HNItem[] = [];
  for (const id of orderedIds) {
    if (picked.length >= digestN) {
      break;
    }
    if (skipProcessed && processed.has(id)) {
      continue;
    }
    const item = await client.fetchItem(id);
    if (!item || !isEligibleStory(item, cfg, keywords)) {
      continue;
    }
    picked.push(item);
  }

  if (picked.length < digestN) {
    console.log(
      `Digest: need ${digestN} eligible stories, only found ${picked.length}. Try HN_DIGEST_IGNORE_PROCESSED=1, lower minScore, or relax keywords.`,
    );
    return;
  }

  if (dryRun) {
    for (const item of picked) {
      console.log(
        `[dry-run] Would fetch body + comments for ${item.id}: ${item.title?.slice(0, 80)}`,
      );
    }
    console.log(
      `[dry-run] Would call DeepSeek once for ${picked.length} stories; skip URL/body fetch and writes.`,
    );
    return;
  }

  const materials: HnDigestStoryMaterial[] = [];
  for (let i = 0; i < picked.length; i++) {
    const item = picked[i];
    const { bodyText, bodySource } = await resolveDigestBodyForItem(item, cfg);
    const topComments = await fetchTopComments(
      client,
      item,
      cfg.commentFetchLimit,
    );
    materials.push({
      ...toMaterial(item, topComments),
      bodyText,
      bodySource,
    });
    if (i < picked.length - 1 && cfg.digestUrlFetchIntervalMs > 0) {
      await sleep(cfg.digestUrlFetchIntervalMs);
    }
  }

  for (const m of materials) {
    console.log(
      `Digest source ${m.id} (${m.bodySource}): ${m.title?.slice(0, 72)}…`,
    );
  }

  let article: { title: string; author: string; body: string };
  try {
    article = await generateWeixinMpDigestFromHn(
      materials,
      cfg.author,
      errorsDir,
    );
  } catch (e) {
    const rawHint = e instanceof Error ? e.message : String(e);
    await mkdir(errorsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errFile = join(errorsDir, `hn-deepseek-error-digest-${stamp}.txt`);
    await writeFile(errFile, rawHint, 'utf-8');
    console.error('DeepSeek failed; wrote details to', errFile);
    throw e;
  }

  const hnIds = materials.map((m) => m.id);
  const payload = {
    title: article.title,
    author: article.author,
    body: article.body,
    source: 'hacker-news-digest',
    hnIds,
    storyCount: materials.length,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(outHtml, article.body, 'utf-8');
  await writeFile(outJson, JSON.stringify(payload, null, 2), 'utf-8');

  for (const id of hnIds) {
    processed.add(id);
  }
  await saveProcessedIds(processedPath, processed);

  console.log('\nDone (digest).');
  console.log(`  HTML: ${outHtml}`);
  console.log(`  JSON: ${outJson}`);
  console.log(`  Title: ${article.title} | Stories: ${hnIds.join(', ')}`);
}

const SPIDER_MAX_STORIES_CAP = 500;

function resolveSpiderMaxStories(cfg: HnConfigFile): number {
  const raw = process.env.HN_SPIDER_MAX_STORIES;
  if (raw !== undefined && raw.trim() !== '') {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) {
      return Math.min(SPIDER_MAX_STORIES_CAP, n);
    }
  }
  return Math.min(SPIDER_MAX_STORIES_CAP, cfg.spiderMaxStories);
}

/** Algolia + Firebase snapshot only; does not call DeepSeek or update processed ids. */
export async function runHnSpiderOnly(): Promise<void> {
  const cfg = loadConfig();
  const keywords = cfg.frameworkKeywords;
  const cwd = process.cwd();
  const outPath = resolve(cwd, cfg.spiderOutputRelative);
  const processedPath = resolve(cwd, cfg.processedIdsRelative);
  const maxStories = resolveSpiderMaxStories(cfg);
  const client = hn;
  const processed = await loadProcessedIds(processedPath);

  const orderedIds = await fetchHotStoryIdsFromAlgoliaAllPages(
    cfg.lookbackDays,
    cfg.algoliaPoolHits,
    ALGOLIA_BATCH_MAX_PAGES,
  );

  const stories: Array<HnStoryMaterial & { alreadyProcessed: boolean }> = [];

  for (const id of orderedIds) {
    if (stories.length >= maxStories) {
      break;
    }
    const item = await client.fetchItem(id);
    if (!item || !isEligibleStory(item, cfg, keywords)) {
      continue;
    }
    const fetchSpiderComments =
      process.env.HN_SPIDER_FETCH_COMMENTS === '1';
    const topComments = fetchSpiderComments
      ? await fetchTopComments(client, item, cfg.commentFetchLimit)
      : [];
    const material = toMaterial(item, topComments);
    stories.push({
      ...material,
      alreadyProcessed: processed.has(id),
    });
  }

  await mkdir(dirname(outPath), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    lookbackDays: cfg.lookbackDays,
    spiderMaxStories: maxStories,
    count: stories.length,
    stories,
  };
  await writeFile(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`HN spider snapshot: ${stories.length} stor(y/ies) -> ${outPath}`);
}

export interface RunHnWeixinPipelineOptions {
  dryRun?: boolean;
  /** When set, overrides env HN_WEIXIN_ARTICLE_COUNT. */
  articleCount?: number;
}

export async function runHnWeixinPipeline(
  options: RunHnWeixinPipelineOptions = {},
): Promise<void> {
  const { dryRun = false } = options;
  const articleCount = resolveArticleCount(options);
  const cfg = loadConfig();
  const keywords = cfg.frameworkKeywords;
  const cwd = process.cwd();

  const outJson = resolve(cwd, cfg.outputJsonRelative);
  const outHtml = resolve(cwd, cfg.outputHtmlRelative);
  const outDir = dirname(outJson);
  const outStem = basename(cfg.outputJsonRelative, '.json');
  const processedPath = resolve(cwd, cfg.processedIdsRelative);
  const errorsDir = resolve(cwd, cfg.errorsDirRelative);

  const client = hn;
  const processed = await loadProcessedIds(processedPath);

  const orderedIds =
    articleCount <= 1
      ? await fetchHotStoryIdsFromAlgolia(
        cfg.lookbackDays,
        cfg.algoliaPoolHits,
        cfg.hotStoryPickCount,
      )
      : await fetchHotStoryIdsFromAlgoliaAllPages(
        cfg.lookbackDays,
        cfg.algoliaPoolHits,
        ALGOLIA_BATCH_MAX_PAGES,
      );

  type ArticlePayload = {
    title: string;
    author: string;
    body: string;
    source: string;
    hnId: number;
    hnUrl: string;
  };

  const batch: ArticlePayload[] = [];

  for (const id of orderedIds) {
    if (batch.length >= articleCount) {
      break;
    }
    if (processed.has(id)) {
      continue;
    }
    const item = await client.fetchItem(id);
    if (!item) {
      continue;
    }
    if (!isEligibleStory(item, cfg, keywords)) {
      continue;
    }

    const chosen = item;
    console.log(
      `Selected story ${chosen.id}: ${chosen.title?.slice(0, 80)}… (score=${chosen.score})`,
    );

    if (dryRun) {
      batch.push({
        title: '[dry-run]',
        author: cfg.author,
        body: '',
        source: 'hacker-news',
        hnId: chosen.id,
        hnUrl: `https://news.ycombinator.com/item?id=${chosen.id}`,
      });
      continue;
    }

    const topComments = await fetchTopComments(
      client,
      chosen,
      cfg.commentFetchLimit,
    );
    const material = toMaterial(chosen, topComments);

    let article: { title: string; author: string; body: string };
    try {
      article = await generateWeixinMpRichTextFromHn(
        material,
        cfg.author,
        errorsDir,
      );
    } catch (e) {
      const rawHint = e instanceof Error ? e.message : String(e);
      await mkdir(errorsDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errFile = join(
        errorsDir,
        `hn-deepseek-error-${chosen.id}-${stamp}.txt`,
      );
      await writeFile(errFile, rawHint, 'utf-8');
      console.error('DeepSeek failed; wrote details to', errFile);
      throw e;
    }

    const payload: ArticlePayload = {
      title: article.title,
      author: article.author,
      body: article.body,
      source: 'hacker-news',
      hnId: chosen.id,
      hnUrl: material.hnUrl,
    };
    batch.push(payload);

    processed.add(chosen.id);
    await saveProcessedIds(processedPath, processed);

    if (articleCount <= 1) {
      await mkdir(outDir, { recursive: true });
      await writeFile(outHtml, article.body, 'utf-8');
      await writeFile(outJson, JSON.stringify(payload, null, 2), 'utf-8');
      console.log('\nDone.');
      console.log(`  HTML: ${outHtml}`);
      console.log(`  JSON: ${outJson}`);
      console.log(`  Title: ${article.title} | Author: ${article.author}`);
      return;
    }

    const idx = batch.length;
    const pad = String(idx).padStart(2, '0');
    const perHtmlPath = resolve(outDir, `${outStem}-${pad}-${chosen.id}.html`);
    await mkdir(outDir, { recursive: true });
    await writeFile(perHtmlPath, article.body, 'utf-8');
    console.log(`  Wrote ${perHtmlPath}`);
  }

  if (batch.length === 0) {
    console.log(
      'No matching HN story in the pool (minScore / lookbackDays / framework keywords / already processed). Try lowering minScore, relaxing frameworkKeywords, or raising HN_WEIXIN_ARTICLE_COUNT scan via algolia pages.',
    );
    return;
  }

  if (articleCount > 1) {
    if (!dryRun) {
      const multiJsonPath = resolve(outDir, `${outStem}-articles.json`);
      await mkdir(outDir, { recursive: true });
      await writeFile(multiJsonPath, JSON.stringify(batch, null, 2), 'utf-8');
      console.log(`  Combined JSON: ${multiJsonPath}`);
    }
    console.log('\nDone (batch).');
    console.log(
      `  Generated ${batch.length} of ${articleCount} requested | Author: ${cfg.author}`,
    );
    if (batch.length < articleCount) {
      console.warn(
        `Warning: fewer articles than HN_WEIXIN_ARTICLE_COUNT=${articleCount} (exhausted pool or filters).`,
      );
    }
    if (dryRun) {
      console.log(`[dry-run] Skipped DeepSeek and file writes.`);
    }
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Would write ${batch.length} article(s).`);
  }
}

// --- CLI ------------------------------------------------------------------------

const dryRun = process.argv.includes('--dry-run');
const spiderOnly = process.argv.includes('--spider-only');
const digestOnly = process.argv.includes('--digest');

if (digestOnly) {
  runHnWeixinDigestPipeline({ dryRun }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (spiderOnly) {
  runHnSpiderOnly().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  runHnWeixinPipeline({ dryRun }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
