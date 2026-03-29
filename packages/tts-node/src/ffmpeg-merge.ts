import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { getFfmpegPath } from './ffmpeg-bin.js';

/**
 * Concatenate MP3s (concat demuxer) and apply playback speed with atempo.
 */
export function mergeMp3WithSpeed(inputFiles: string[], outputPath: string, speed: number): void {
  if (inputFiles.length === 0) {
    throw new Error('mergeMp3WithSpeed: no input files');
  }

  const listPath = `${outputPath}.concat.txt`;
  const body = inputFiles.map((f) => `file '${resolve(f).replace(/'/g, `'\\''`)}'`).join('\n');
  writeFileSync(listPath, body, 'utf-8');

  try {
    const result = spawnSync(
      getFfmpegPath(),
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-vn',
        '-filter:a',
        `atempo=${speed}`,
        '-c:a',
        'libmp3lame',
        '-q:a',
        '2',
        outputPath,
      ],
      { encoding: 'utf-8' },
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `ffmpeg exited ${result.status}`);
    }
  } finally {
    try {
      unlinkSync(listPath);
    } catch {
      /* ignore */
    }
  }
}

export function assertFfmpegAvailable(): void {
  const r = spawnSync(getFfmpegPath(), ['-version'], { encoding: 'utf-8' });
  if (r.status !== 0) {
    throw new Error(
      'ffmpeg is required for TTS merge/speed step. Run pnpm install (ffmpeg-static) or install ffmpeg on PATH.',
    );
  }
}
