# @panda-video-generator/tts-node

Node.js **Edge-TTS** pipeline (concatenate segments, WebVTT, ffmpeg `atempo` where needed):

- Non-empty lines in the input file = one TTS paragraph each
- Batched concurrent synthesis (default 3 at a time)
- **ffmpeg**: concat MP3s + `atempo` (default **1.1×**)
- Writes **`audio.mp3`** and **`audio.vtt`** in the output directory

## Requirements

- **ffmpeg**: monorepo uses **`ffmpeg-static`** after `pnpm install` (falls back to `ffmpeg` on `PATH` if bundled binary is unavailable). No separate system install required for most setups.
- Network access (Microsoft Edge TTS endpoint)

## CLI

From monorepo root (same env vars as `pnpm tts` / `scripts/run-tts.mjs` for paths):

```bash
# Full pipeline (generate + sync to public/): from repo root
pnpm tts

# CLI only (no sync): explicit paths
pnpm exec tsx packages/tts-node/src/cli.ts output/spider/input.txt output/tts
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `SPIDER_OUTPUT_DIR` | `output/spider` | With default input: `$SPIDER_OUTPUT_DIR/input.txt` |
| `TTS_INPUT_FILE` | (see above) | Narration text path |
| `TTS_OUTPUT_DIR` | `output/tts` | `audio.mp3` / `audio.vtt` |
| `TTS_PUBLIC_DIR` | `public/tts` | Sync target for Remotion (`pnpm tts`) |
| `EDGE_TTS_VOICE` | `zh-CN-YunjianNeural` | Neural voice name |

## Programmatic

```ts
import { processNarrationFile } from '@panda-video-generator/tts-node';

await processNarrationFile('/abs/path/input.txt', '/abs/path/output/tts', {
  voice: 'zh-CN-XiaoxiaoNeural',
  speedFactor: 1.1,
});
```

## Implementation notes

- Depends on [`node-edge-tts`](https://www.npmjs.com/package/node-edge-tts) (WebSocket Edge Read Aloud API).
- Durations come from [`music-metadata`](https://www.npmjs.com/package/music-metadata) on each sentence MP3 before merge.
