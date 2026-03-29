import { spawnSync } from "node:child_process";
import { projectRoot } from "./project-root.mjs";
import { getFfmpegPath } from "./resolve-ffmpeg.mjs";

/**
 * Run a command with inherited stdio. `shell: true` so `pnpm` resolves on Windows.
 */
export function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
    env: process.env,
    ...options,
  });
  return result.status ?? 1;
}

export function hasFfmpeg() {
  const ff = getFfmpegPath();
  const r = spawnSync(ff, ["-version"], {
    stdio: "ignore",
    shell: false,
  });
  return r.status === 0;
}

/** Run bundled or PATH ffmpeg (no shell; safe for paths with spaces). */
export function runFfmpeg(args, options = {}) {
  const ff = getFfmpegPath();
  const result = spawnSync(ff, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: process.env,
    ...options,
  });
  return result.status ?? 1;
}
