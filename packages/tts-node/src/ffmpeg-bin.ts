import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);

function versionOk(executable: string): boolean {
	const r = spawnSync(executable, ['-version'], {
		stdio: 'ignore',
		shell: false,
	});
	return r.status === 0;
}

let resolved: string | null = null;

/** Prefer ffmpeg-static when it runs; else PATH `ffmpeg`. */
export function getFfmpegPath(): string {
	if (resolved) return resolved;

	try {
		const bundled = require('ffmpeg-static') as string;
		if (
			typeof bundled === 'string' &&
			bundled.length > 0 &&
			existsSync(bundled) &&
			versionOk(bundled)
		) {
			resolved = bundled;
			return bundled;
		}
	} catch {
		/* optional */
	}

	resolved = 'ffmpeg';
	return 'ffmpeg';
}
