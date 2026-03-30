#!/usr/bin/env node

/**
 * Spider: any http(s) page → { title, content } JSON (env vars only).
 * Uses GenericPageSpider (Zhihu questions still get Zhihu-specific extraction when URL matches).
 *
 * Required:
 *   SPIDER_SOURCE — full page URL
 *   SPIDER_OUTPUT_DIR — directory for the JSON file (created if missing)
 *
 * Optional:
 *   SPIDER_OUTPUT_FILENAME — default output.json
 */

import { resolve } from 'path';
import { promises as fs } from 'fs';
import { extractPageUrlToSpiderJson, type SpiderJsonOutput } from './extract-json';

async function main(): Promise<void> {
  const source = process.env.SPIDER_SOURCE?.trim();
  const outDirRaw = process.env.SPIDER_OUTPUT_DIR?.trim();
  const outName = (process.env.SPIDER_OUTPUT_FILENAME?.trim() || 'output.json').replace(/^[/\\]+/, '');

  if (!source || !outDirRaw) {
    console.error(
      'Required env: SPIDER_SOURCE (full http(s) URL), SPIDER_OUTPUT_DIR\n' +
        'Optional: SPIDER_OUTPUT_FILENAME (default: output.json)',
    );
    process.exit(1);
  }

  if (!source.startsWith('http://') && !source.startsWith('https://')) {
    console.error('SPIDER_SOURCE must be a full URL starting with http:// or https://');
    process.exit(1);
  }

  const outDir = resolve(process.cwd(), outDirRaw);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, outName);

  const result: SpiderJsonOutput = await extractPageUrlToSpiderJson(source);

  await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Wrote ${outPath}`);
  console.log(`Title: ${result.title.slice(0, 80)}${result.title.length > 80 ? '…' : ''}`);
  console.log(`Content length: ${result.content.length} chars`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
