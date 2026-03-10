#!/usr/bin/env node

/**
 * RSS Title Spider & Translator
 * Fetches title + guid from RSS feeds (one feed at a time), filters already-seen,
 * stops when new items reach cap, translates titles via DeepSeek.
 *
 * Usage:
 *   pnpm spider:rss
 *   pnpm spider:rss -- <rss_url1> <rss_url2> ...
 */

import Parser from 'rss-parser';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { promises as fs } from 'fs';

const parser = new Parser({ timeout: 15000 });

const SEEN_GUIDS_PATH = resolve(process.cwd(), 'spider/rss-seen-guids.json');
const DEFAULT_RSS_FEEDS: string[] = [
  'https://feeds.feedburner.com/TheHackersNews',
  'https://www.echojs.com/rss',
];
const TRANSLATE_BATCH_SIZE = 30;
const MAX_NEW_ITEMS = 100;
const FETCH_DELAY_MS = 500;

/** Number of articles to select and return as top picks (guid + translated title). */
const TOP_N = 3;

export interface RssItem {
  guid: string;
  title: string;
  feedUrl?: string;
}

export interface TranslatedItem extends RssItem {
  translatedTitle: string;
}

function loadApiKey(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      if (line.startsWith('DEEPSEEK_API_KEY=')) {
        process.env.DEEPSEEK_API_KEY = line.split('=')[1].trim();
        break;
      }
    }
  } catch {
    // use process.env
  }
}

/** Load seen GUIDs from JSON file. */
export async function loadSeenGuids(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(SEEN_GUIDS_PATH, 'utf-8');
    const data = JSON.parse(raw) as { guids?: string[] } | string[];
    const list = Array.isArray(data)
      ? data
      : Array.isArray((data as { guids?: string[] }).guids)
        ? (data as { guids: string[] }).guids
        : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

/** Save seen GUIDs to JSON file. */
export async function saveSeenGuids(seen: Set<string>): Promise<void> {
  const dir = resolve(process.cwd(), 'spider');
  await fs.mkdir(dir, { recursive: true });
  const payload = {
    guids: Array.from(seen).sort(),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(SEEN_GUIDS_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}

/** Fetch all items (title + guid) from a single RSS URL. */
export async function fetchOneFeed(url: string): Promise<RssItem[]> {
  const items: RssItem[] = [];
  try {
    const feed = await parser.parseURL(url);
    const list = feed.items ?? [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const title = item.title?.trim();
      if (!title) continue;
      const guid = item.guid ?? item.link ?? `${url}#${i}`;
      items.push({ guid, title, feedUrl: url });
    }
  } catch (err) {
    console.warn(`⚠️  Failed to fetch RSS: ${url}`, err instanceof Error ? err.message : err);
  }
  return items;
}

/** Ask DeepSeek to select top N articles for Chinese media + eye-catching, return guid + translated title. */
async function selectAndTranslateTopN(
  openai: OpenAI,
  items: RssItem[],
  n: number
): Promise<TranslatedItem[]> {
  const list = items
    .map((it) => `${it.guid}\t${it.title}`)
    .join('\n');
  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `You are an editor for Chinese digital media. From a list of article links (guid) and English titles, select the top ${n} that are most suitable for Chinese readers and most eye-catching (热点、争议、科技、安全、重大事件等). Translate each selected title into natural Chinese. Reply with exactly ${n} lines. Each line: original_guid + TAB + translated_Chinese_title. No numbering, no explanation, no extra text. Preserve the guid exactly as given.`,
      },
      {
        role: 'user',
        content: `From the following list, select the top ${n} most suitable for Chinese media and eye-catching, translate to Chinese. Output ${n} lines, each line: guid<TAB>中文标题\n\n${list}`,
      },
    ],
    temperature: 0.3,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return [];
  const itemByGuid = new Map(items.map((it) => [it.guid, it]));
  const results: TranslatedItem[] = [];
  const lines = text.split(/\n+/).map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean);
  for (const line of lines) {
    const tabIdx = line.indexOf('\t');
    if (tabIdx === -1) continue;
    const guid = line.slice(0, tabIdx).trim();
    const translatedTitle = line.slice(tabIdx + 1).trim();
    const orig = itemByGuid.get(guid);
    if (orig && results.length < n) {
      results.push({ ...orig, translatedTitle: translatedTitle || orig.title });
    }
  }
  return results.slice(0, n);
}

/** Translate a batch of titles to Chinese via DeepSeek; returns same order. */
async function translateBatch(
  openai: OpenAI,
  titles: string[]
): Promise<string[]> {
  const numbered = titles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content:
          'You are a translator. Translate the following list of titles into Chinese. Reply with ONLY the translated titles, one per line, in the exact same order. No numbering, no explanation.',
      },
      {
        role: 'user',
        content: `Translate to Chinese, one per line, same order:\n${numbered}`,
      },
    ],
    temperature: 0.2,
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) return titles.map(() => '');
  const lines = text
    .split(/\n+/)
    .map((s) => s.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length >= titles.length) return lines.slice(0, titles.length);
  return lines;
}

/** Translate all items in batches (used when not using top-N selection). */
export async function translateTitles(
  items: RssItem[],
  apiKey: string
): Promise<TranslatedItem[]> {
  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
  });
  const results: TranslatedItem[] = [];
  for (let i = 0; i < items.length; i += TRANSLATE_BATCH_SIZE) {
    const batch = items.slice(i, i + TRANSLATE_BATCH_SIZE);
    const titles = batch.map((x) => x.title);
    const translated = await translateBatch(openai, titles);
    for (let j = 0; j < batch.length; j++) {
      results.push({
        ...batch[j],
        translatedTitle: translated[j] ?? batch[j].title,
      });
    }
  }
  return results;
}

/**
 * Main: for each RSS URL, fetch → filter seen → collect new; stop when new >= MAX_NEW_ITEMS.
 * Then translate and persist new guids.
 */
export async function runRssTitleTranslator(
  feedUrls: string[]
): Promise<TranslatedItem[]> {
  loadApiKey();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set. Set it in .env.local or environment.');
  }

  const seen = await loadSeenGuids();
  const newItems: RssItem[] = [];
  let totalFetched = 0;
  let stoppedByCap = false;

  for (const url of feedUrls) {
    if (newItems.length >= MAX_NEW_ITEMS) {
      stoppedByCap = true;
      break;
    }
    const feedItems = await fetchOneFeed(url);
    totalFetched += feedItems.length;
    for (const item of feedItems) {
      if (seen.has(item.guid)) continue;
      newItems.push(item);
      if (newItems.length >= MAX_NEW_ITEMS) {
        stoppedByCap = true;
        break;
      }
    }
    if (newItems.length < MAX_NEW_ITEMS && feedUrls.indexOf(url) < feedUrls.length - 1) {
      await new Promise((r) => setTimeout(r, FETCH_DELAY_MS));
    }
  }

  const toTranslate = newItems.slice(0, MAX_NEW_ITEMS);
  if (toTranslate.length === 0) {
    console.log(`No new items (fetched ${totalFetched}, ${seen.size} already seen).`);
    return [];
  }

  console.log(
    `RSS spider: ${toTranslate.length} new items${stoppedByCap ? ` (cap ${MAX_NEW_ITEMS})` : ''} (fetched ${totalFetched}, ${seen.size} seen).`
  );

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
  });
  const topN = Math.min(TOP_N, toTranslate.length);
  const selected = await selectAndTranslateTopN(openai, toTranslate, topN);
  for (const item of toTranslate) seen.add(item.guid);
  await saveSeenGuids(seen);
  return selected;
}

async function main() {
  const urls = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_RSS_FEEDS;
  console.log('RSS Title Spider & Translator');
  console.log('Feeds:', urls.join(', '));
  try {
    const result = await runRssTitleTranslator(urls);
    console.log(`\n--- Top ${result.length} (guid → 中文标题) ---`);
    result.forEach((r, i) => {
      console.log(`${i + 1}. ${r.guid}\t${r.translatedTitle}`);
    });
    console.log('\n--- Titles only (for copy) ---');
    console.log(result.map((r) => r.translatedTitle).join('\n'));
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default runRssTitleTranslator;
