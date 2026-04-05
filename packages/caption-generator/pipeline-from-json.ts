import { resolve } from 'path';
import { promises as fs } from 'fs';
import { generateVideoScriptText, type VideoScriptSourcePayload } from './caption-generator';
import { scriptToEstimatedWebVtt } from './webvtt-estimate';

export type RunFromSpiderJsonOptions = {
  /** Seconds per character for timing heuristic (default 0.12). */
  secPerChar?: number;
  scriptFilename?: string;
  vttFilename?: string;
};

/**
 * Read spider Zhihu JSON { title, content, answers }, call DeepSeek for script, write script + estimated WebVTT into outputDir.
 */
export async function runCaptionAndVttFromSpiderJson(
  jsonFilePath: string,
  outputDir: string,
  options: RunFromSpiderJsonOptions = {},
): Promise<{ scriptPath: string; vttPath: string }> {
  const absJson = resolve(jsonFilePath);
  const raw = JSON.parse(await fs.readFile(absJson, 'utf-8')) as VideoScriptSourcePayload & {
    sourceUrl?: string;
  };

  const payload: VideoScriptSourcePayload = {
    title: raw.title ?? '',
    content: raw.content ?? '',
    answers: Array.isArray(raw.answers) ? raw.answers : [],
  };

  if (!payload.title || (!payload.content && !payload.answers.length)) {
    throw new Error('Invalid spider JSON: need title and content or answers');
  }

  const scriptText = await generateVideoScriptText(payload);
  if (!scriptText) {
    throw new Error('LLM returned empty script');
  }

  const outDir = resolve(outputDir);
  await fs.mkdir(outDir, { recursive: true });

  const scriptName = options.scriptFilename?.replace(/^[/\\]+/, '') || 'input.txt';
  const vttName = options.vttFilename?.replace(/^[/\\]+/, '') || 'captions.vtt';

  const scriptPath = resolve(outDir, scriptName);
  const vttPath = resolve(outDir, vttName);

  await fs.writeFile(scriptPath, scriptText, 'utf-8');
  console.log(`Script saved: ${scriptPath}`);

  const titlePath = resolve(outDir, 'title.json');
  await fs.writeFile(
    titlePath,
    JSON.stringify({ title: payload.title }, null, 2),
    'utf-8',
  );
  console.log(`Title JSON saved: ${titlePath}`);

  const vtt = scriptToEstimatedWebVtt(scriptText, options.secPerChar);
  await fs.writeFile(vttPath, vtt, 'utf-8');
  console.log(`WebVTT saved: ${vttPath}`);

  return { scriptPath, vttPath };
}
