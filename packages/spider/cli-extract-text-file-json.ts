#!/usr/bin/env node

/**
 * Spider: local UTF-8 text file → { title, content } JSON (env vars only).
 * Optional: first line `# Heading` (Markdown-style) sets title; else title = filename stem.
 *
 * Required:
 *   SPIDER_SOURCE — path to text file (relative to cwd ok)
 *   SPIDER_OUTPUT_DIR — directory for the JSON file (created if missing)
 *
 * Optional:
 *   SPIDER_OUTPUT_FILENAME — default output.json
 */

import { resolve } from 'path';
import { promises as fs } from 'fs';
import { parseTextFileToSpiderJson, type SpiderJsonOutput } from './extract-json';

async function main(): Promise<void> {
  const source = process.env.SPIDER_SOURCE?.trim();
  const outDirRaw = process.env.SPIDER_OUTPUT_DIR?.trim();
  const outName = (process.env.SPIDER_OUTPUT_FILENAME?.trim() || 'output.json').replace(/^[/\\]+/, '');

  if (!source || !outDirRaw) {
    console.error(
      'Required env: SPIDER_SOURCE (path to text file), SPIDER_OUTPUT_DIR\n' +
        'Optional: SPIDER_OUTPUT_FILENAME (default: output.json)',
    );
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), source);
  const outDir = resolve(process.cwd(), outDirRaw);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, outName);

  const result: SpiderJsonOutput = parseTextFileToSpiderJson(filePath);

  await fs.writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Wrote ${outPath}`);
  console.log(`Title: ${result.title.slice(0, 80)}${result.title.length > 80 ? '…' : ''}`);
  console.log(`Content length: ${result.content.length} chars`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
