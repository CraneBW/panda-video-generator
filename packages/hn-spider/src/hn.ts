#!/usr/bin/env node
/**
 * Hacker News -> DeepSeek -> WeChat MP rich text (HTML).
 * Monorepo package under packages/hn-spider; mirrors spider/zhihu-to-weixin-mp-article.ts (DeepSeek, JSON+HTML output).
 *
 *   pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp
 *   pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp:dry
 *
 * DEEPSEEK_API_KEY: repo-root `.env.local` (monorepo root) or process env.
 * Config: hn-config.json next to this package. Output paths are relative to cwd.
 */

import OpenAI from 'openai';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
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

// --- Pipeline -------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

interface HnConfigFile {
  minScore: number;
  maxAgeHours: number;
  storyLists: HNStoryListKind[];
  fetchLimit: number;
  commentFetchLimit: number;
  author: string;
  outputJsonRelative: string;
  outputHtmlRelative: string;
  processedIdsRelative: string;
  errorsDirRelative: string;
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
  const path = join(__dirname, '..', 'hn-config.json');
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('hn-config.json: invalid root');
  }
  const c = raw as Record<string, unknown>;
  const kw = c.frameworkKeywords;
  if (!Array.isArray(kw) || !kw.every((x) => typeof x === 'string')) {
    throw new Error('hn-config.json: frameworkKeywords must be string[]');
  }
  return raw as HnConfigFile;
}

function findMonorepoRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  const { root } = parse(dir);
  while (dir !== root) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

function loadDeepseekApiKeyFromRootEnvLocal(): void {
  if (process.env.DEEPSEEK_API_KEY) {
    return;
  }
  const root = findMonorepoRoot(__dirname);
  if (!root) {
    return;
  }
  const envPath = join(root, '.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('DEEPSEEK_API_KEY=')) {
        process.env.DEEPSEEK_API_KEY = line.split('=')[1]?.trim() ?? '';
        break;
      }
    }
  } catch {
    // use system env only
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

function mergeStoryIds(top: number[], best: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of top) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of best) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
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
  const maxSec = cfg.maxAgeHours * 3600;
  if (storyAgeSeconds(item) > maxSec) {
    return false;
  }
  return matchesFramework(item.title, item.url, keywords);
}

function compareCandidates(a: HNItem, b: HNItem): number {
  const sa = a.score ?? 0;
  const sb = b.score ?? 0;
  if (sb !== sa) {
    return sb - sa;
  }
  const ta = a.time ?? 0;
  const tb = b.time ?? 0;
  return tb - ta;
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
    JSON.stringify([...ids].sort((a, b) => a - b), null, 2),
    'utf-8',
  );
}

async function generateWeixinMpRichTextFromHn(
  material: HnStoryMaterial,
  defaultAuthor: string,
  errorsDir: string,
): Promise<{ title: string; author: string; body: string }> {
  loadDeepseekApiKeyFromRootEnvLocal();
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error(
      'DEEPSEEK_API_KEY is not set. Add it to the monorepo root .env.local or export it in the shell.',
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
7. 正文总字数控制在 600～1200 字，段落适中。

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

export interface RunHnWeixinPipelineOptions {
  dryRun?: boolean;
}

export async function runHnWeixinPipeline(
  options: RunHnWeixinPipelineOptions = {},
): Promise<void> {
  const { dryRun = false } = options;
  const cfg = loadConfig();
  const keywords = cfg.frameworkKeywords;
  const cwd = process.cwd();

  const outJson = resolve(cwd, cfg.outputJsonRelative);
  const outHtml = resolve(cwd, cfg.outputHtmlRelative);
  const processedPath = resolve(cwd, cfg.processedIdsRelative);
  const errorsDir = resolve(cwd, cfg.errorsDirRelative);

  const client = hn;
  const processed = await loadProcessedIds(processedPath);

  const topIds: number[] = [];
  const bestIds: number[] = [];

  for (const kind of cfg.storyLists) {
    if (kind === 'top') {
      topIds.push(...(await client.fetchStoryIdList('top')));
    } else if (kind === 'best') {
      bestIds.push(...(await client.fetchStoryIdList('best')));
    }
  }

  const merged = mergeStoryIds(topIds, bestIds).slice(0, cfg.fetchLimit);

  const candidates: HNItem[] = [];
  for (const id of merged) {
    if (processed.has(id)) {
      continue;
    }
    const item = await client.fetchItem(id);
    if (!item) {
      continue;
    }
    if (isEligibleStory(item, cfg, keywords)) {
      candidates.push(item);
    }
  }

  candidates.sort(compareCandidates);
  const chosen = candidates[0];

  if (!chosen) {
    console.log(
      'No matching HN story (score / age / framework keywords / already processed). Try lowering minScore or widening maxAgeHours.',
    );
    return;
  }

  console.log(
    `Selected story ${chosen.id}: ${chosen.title?.slice(0, 80)}… (score=${chosen.score})`,
  );

  if (dryRun) {
    console.log('[dry-run] Skipping DeepSeek and file writes.');
    return;
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
    const rawHint =
      e instanceof Error ? e.message : String(e);
    await mkdir(errorsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errFile = join(errorsDir, `hn-deepseek-error-${chosen.id}-${stamp}.txt`);
    await writeFile(errFile, rawHint, 'utf-8');
    console.error('DeepSeek failed; wrote details to', errFile);
    throw e;
  }

  await mkdir(dirname(outJson), { recursive: true });
  await writeFile(outHtml, article.body, 'utf-8');
  await writeFile(
    outJson,
    JSON.stringify(
      {
        title: article.title,
        author: article.author,
        body: article.body,
        source: 'hacker-news',
        hnId: chosen.id,
        hnUrl: material.hnUrl,
      },
      null,
      2,
    ),
    'utf-8',
  );

  processed.add(chosen.id);
  await saveProcessedIds(processedPath, processed);

  console.log('\nDone.');
  console.log(`  HTML: ${outHtml}`);
  console.log(`  JSON: ${outJson}`);
  console.log(`  Title: ${article.title} | Author: ${article.author}`);
}

// --- CLI ------------------------------------------------------------------------

const dryRun = process.argv.includes('--dry-run');

runHnWeixinPipeline({ dryRun }).catch((err) => {
  console.error(err);
  process.exit(1);
});
