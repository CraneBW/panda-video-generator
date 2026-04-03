---
name: tts-node
description: >-
  Atomic reference for @panda-video-generator/tts-node: pnpm tts, cli.ts, processNarrationFile —
  Edge-TTS narration → audio.mp3 + audio.vtt; env vars TTS_*, EDGE_TTS_*, ffmpeg.
  Triggers: TTS, Edge-TTS, 口播音频, audio.mp3, public/tts.
---

# TTS Node — 三种用法（输入 / 输出 / 环境变量）

包 **`@panda-video-generator/tts-node`**：读口播纯文本（**非空行 = 一段**），用 **Microsoft Edge TTS** 合成、**ffmpeg** 拼接并 **`atempo`** 加速，写出 **`audio.mp3`** + **`audio.vtt`**。需 **网络**；**ffmpeg 在 PATH**。`packages/tts-node/README.md` 仅为路牌链回本文。

---

## 1. 仓库根 `pnpm tts`（生成 + 校验 + 同步到 `public/`）

**用法**

```bash
pnpm tts
```

根脚本设 **`cross-env`**：`SPIDER_OUTPUT_DIR=output/spider`、`TTS_OUTPUT_DIR=output/tts`、`TTS_PUBLIC_DIR=public/tts`，执行 **`node scripts/run-tts.mjs`**：检查输入与 ffmpeg → **`tsx packages/tts-node/src/cli.ts`** → 再 **`node scripts/sync-outputs-to-public.mjs`**。

**输入**

| 项目 | 说明 |
|------|------|
| 口播文本文件 | 默认 **`$TTS_INPUT_FILE`**，未设则为 **`$SPIDER_OUTPUT_DIR/input.txt`**（路径相对仓库根，脚本内解析） |

**输出**

| 路径 | 内容 |
|------|------|
| `<TTS_OUTPUT_DIR>/audio.mp3` | 合并后的音频 |
| `<TTS_OUTPUT_DIR>/audio.vtt` | 与真实分段时长对齐的 WebVTT |
| `<TTS_PUBLIC_DIR>/audio.mp3`、`<TTS_PUBLIC_DIR>/audio.vtt` | **sync** 后的副本（供 Remotion 等） |

**环境变量**

| 变量 | 必填 | 默认 / 说明 |
|------|------|-------------|
| `SPIDER_OUTPUT_DIR` | 否 | `output/spider`（参与默认输入路径） |
| `TTS_INPUT_FILE` | 否 | `<SPIDER_OUTPUT_DIR>/input.txt` |
| `TTS_OUTPUT_DIR` | 否 | `output/tts` |
| `TTS_PUBLIC_DIR` | 否 | `public/tts`（sync 目标） |
| `EDGE_TTS_VOICE` | 否 | `zh-CN-YunjianNeural` |
| `EDGE_TTS_BATCH_SIZE` | 否 | `3`，最大 `8`（并行段数） |
| `EDGE_TTS_TIMEOUT_MS` | 否 | `120000`（每段 WebSocket，下限 15000） |

---

## 2. 仅 CLI（不跑 `sync-outputs-to-public`）

**用法**

在 **monorepo 根**（或自行保证 `cwd` 下相对路径正确）：

```bash
pnpm exec tsx packages/tts-node/src/cli.ts [input_file] [output_dir]
```

省略参数时用环境变量默认值（见下），逻辑见 `src/cli.ts`：

```bash
pnpm exec tsx packages/tts-node/src/cli.ts
# → resolve(cwd, TTS_INPUT_FILE 或 <SPIDER_OUTPUT_DIR>/input.txt) → resolve(cwd, TTS_OUTPUT_DIR)
```

**输入**

| 项目 | 说明 |
|------|------|
| `input_file`（可选 argv[2]） | 口播文本；未给则用 **`TTS_INPUT_FILE`** 或 **`<SPIDER_OUTPUT_DIR>/input.txt`** |
| 文本规则 | **非空行**各为一段 TTS；全文为空或无非空行会 **throw** |

**输出**

| 路径 | 内容 |
|------|------|
| `<output_dir>/audio.mp3` | 合并后音频 |
| `<output_dir>/audio.vtt` | WebVTT |
| `<output_dir>/sentence*.mp3` | 中间文件，流程结束会 **删除** |

**环境变量**

| 变量 | 必填 | 默认 / 说明 |
|------|------|-------------|
| `SPIDER_OUTPUT_DIR` | 否 | `output/spider` |
| `TTS_INPUT_FILE` | 否 | `<SPIDER_OUTPUT_DIR>/input.txt` |
| `TTS_OUTPUT_DIR` | 否 | `output/tts`（仅在未传 `output_dir`  argv 时作为默认） |
| `EDGE_TTS_VOICE` | 否 | 同用法 1 |
| `EDGE_TTS_BATCH_SIZE` | 否 | 同用法 1 |
| `EDGE_TTS_TIMEOUT_MS` | 否 | 同用法 1 |

`cli.ts` **不读取** `TTS_PUBLIC_DIR`（不同步 public）。

---

## 3. 程序调用 `processNarrationFile`

**用法**

```ts
import { processNarrationFile } from '@panda-video-generator/tts-node';

await processNarrationFile('/abs/or/cwd-relative/input.txt', '/abs/or/cwd-relative/output/tts', {
  voice: 'zh-CN-XiaoxiaoNeural',
  speedFactor: 1.1,
  batchSize: 3,
});
```

`options` 均可省略：`voice` / **`speedFactor`**（默认 **1.1**，ffmpeg `atempo`）/ **`batchSize`**（默认读 **`EDGE_TTS_BATCH_SIZE`** 或 3）。`voice` 未传时用 **`EDGE_TTS_VOICE`** 或 `zh-CN-YunjianNeural`；可用 **`normalizeVoiceForEdgeReadAloud`**（同包导出）纠正 Azure 式冒号命名。

**输入**

| 项目 | 说明 |
|------|------|
| `inputFile` | 口播文件绝对路径或相对 **当前 Node 进程 cwd** |
| `outputDir` | 输出目录（会 `mkdir`） |

**输出**

| 路径 | 内容 |
|------|------|
| `<outputDir>/audio.mp3`、`<outputDir>/audio.vtt` | 同 CLI |

**环境变量**

| 变量 | 说明 |
|------|------|
| `EDGE_TTS_VOICE` | `options.voice` 未传时使用 |
| `EDGE_TTS_BATCH_SIZE` | `options.batchSize` 未传时使用 |
| `EDGE_TTS_TIMEOUT_MS` | 每段超时 |

**额外导出（按需）**：`generateVtt`、`splitTextForVtt`、`formatVttTime`（`vtt.ts`），一般 **`processNarrationFile` 已写入 `audio.vtt`**。
