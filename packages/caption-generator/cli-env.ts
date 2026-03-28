#!/usr/bin/env node

/**
 * Env-only CLI: spider JSON → DeepSeek caption → estimated WebVTT in CAPTION_OUTPUT_DIR.
 *
 * Required:
 *   CAPTION_INPUT_JSON   — path to { title, content, answers[] } JSON (e.g. spider output)
 *   CAPTION_OUTPUT_DIR   — directory for input.txt (script) and .vtt
 *
 * Optional:
 *   CAPTION_SCRIPT_FILENAME  — default input.txt
 *   CAPTION_VTT_FILENAME     — default captions.vtt
 *   CAPTION_SEC_PER_CHAR     — default 0.12 (timing heuristic for Chinese)
 */

import { resolve } from 'path';
import { runCaptionAndVttFromSpiderJson } from './pipeline-from-json';

async function main(): Promise<void> {
  const jsonRaw = process.env.CAPTION_INPUT_JSON?.trim();
  const outDirRaw = process.env.CAPTION_OUTPUT_DIR?.trim();

  if (!jsonRaw || !outDirRaw) {
    console.error(
      'Required env: CAPTION_INPUT_JSON, CAPTION_OUTPUT_DIR\n' +
        'Optional: CAPTION_SCRIPT_FILENAME (default input.txt), CAPTION_VTT_FILENAME (default captions.vtt), CAPTION_SEC_PER_CHAR',
    );
    process.exit(1);
  }

  const jsonPath = resolve(process.cwd(), jsonRaw);
  const outDir = resolve(process.cwd(), outDirRaw);
  const scriptName = process.env.CAPTION_SCRIPT_FILENAME?.trim();
  const vttName = process.env.CAPTION_VTT_FILENAME?.trim();
  const sec = process.env.CAPTION_SEC_PER_CHAR?.trim();
  const secPerChar = sec !== undefined && sec !== '' ? Number(sec) : undefined;
  if (secPerChar !== undefined && (Number.isNaN(secPerChar) || secPerChar <= 0)) {
    console.error('CAPTION_SEC_PER_CHAR must be a positive number');
    process.exit(1);
  }

  await runCaptionAndVttFromSpiderJson(jsonPath, outDir, {
    scriptFilename: scriptName || undefined,
    vttFilename: vttName || undefined,
    secPerChar,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
