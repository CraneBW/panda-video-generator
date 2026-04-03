---
name: caption-generator
description: >-
  Atomic reference for @panda-video-generator/caption-generator: pnpm caption:env, write input.txt only,
  string-only DeepSeek + optional WebVTT estimate; inputs, outputs, env vars.
  Triggers: 口播, input.txt, captions.vtt, CAPTION_*, DEEPSEEK.
---

# Caption Generator — 三种用法（输入 / 输出 / 环境变量）

在 **monorepo 根目录**执行（`cwd` 影响路径；`DEEPSEEK_API_KEY` 从仓库根 **`.env`** 或环境变量读取）。不负责爬取。`packages/caption-generator/README.md` 仅为路牌链回本文。

**Payload**（凡调 DeepSeek）：`title` 非空，且 **`content` 或 `answers` 至少一方有内容**（`answers` 非数组视为 `[]`，此时须 **`content`**）。可带 `sourceUrl`，不参与模型。

```ts
{
  title: string;
  content: string;
  answers: Array<{ author: string; content: string; voteCount: number }>;
}
```

---

## 1. 环境变量 CLI：爬虫 JSON → 口播 + 估算 WebVTT + `title.json`

**用法**

```bash
pnpm run caption:env
```

根脚本带 **`cross-env`**：`SPIDER_OUTPUT_DIR=output/spider`、`CAPTION_OUTPUT_DIR=output/spider`、`CAPTION_INPUT_JSON=output/spider/output.json`，执行 **`tsx packages/caption-generator/cli-env.ts`**。

等价程序化（自行写 `tsx` 时）：

`import { runCaptionAndVttFromSpiderJson } from '@panda-video-generator/caption-generator/pipeline'`  
签名：`(jsonFilePath, outputDir, options?)`，效果与同命令行一致的三个输出文件及以下 CAPTION_* 含义。

**输入**

| 项目 | 说明 |
|------|------|
| JSON 文件 | 默认 `CAPTION_INPUT_JSON`；须为合法 Payload（路径相对 **cwd**） |

**输出**（`CAPTION_OUTPUT_DIR`，必要时 `mkdir`）

| 路径 | 内容 |
|------|------|
| `<CAPTION_OUTPUT_DIR>/<CAPTION_SCRIPT_FILENAME>` | 口播（默认 `input.txt`） |
| `<CAPTION_OUTPUT_DIR>/<CAPTION_VTT_FILENAME>` | 估算 WebVTT（默认 `captions.vtt`） |
| `<CAPTION_OUTPUT_DIR>/title.json` | `{ "title": string }`（固定文件名） |

**环境变量**

| 变量 | 必填 | 默认 / 说明 |
|------|------|-------------|
| `CAPTION_INPUT_JSON` | 否 | 未设 → `<SPIDER_OUTPUT_DIR>/output.json` |
| `CAPTION_OUTPUT_DIR` | 否 | `output/spider` |
| `CAPTION_SCRIPT_FILENAME` | 否 | `input.txt` |
| `CAPTION_VTT_FILENAME` | 否 | `captions.vtt` |
| `CAPTION_SEC_PER_CHAR` | 否 | `0.12`；须 **> 0**，否则 CLI 退出 1 |
| `SPIDER_OUTPUT_DIR` | 否 | 影响默认 JSON 路径 |
| `DEEPSEEK_API_KEY` | 是 | 环境变量或根目录 `.env` |

---

## 2. 仅写口播 `input.txt`（内存对象或 JSON 路径）

**用法**

```ts
import { generateVideoScript, generateVideoScriptFromFile } from '@panda-video-generator/caption-generator';

await generateVideoScript({ title, content, answers }[, outputDir]);
await generateVideoScriptFromFile(jsonPath[, outputDir]);
```

- 省略 `outputDir` → **`getTtsInputFile()`**：有 **`TTS_INPUT_FILE`** 用其值，否则 **`<SPIDER_OUTPUT_DIR>/input.txt`**。  
- 传入 `outputDir` → **`<outputDir>/input.txt`**（文件名固定）。

**输入**

| 项目 | 说明 |
|------|------|
| 对象 | Payload（+ 可选 `sourceUrl`） |
| `jsonPath` | 同上结构的 JSON 文件 |

**输出**

| 路径 | 内容 |
|------|------|
| `getTtsInputFile()` 或 `<outputDir>/input.txt` | 口播纯文本 |

**环境变量**

| 变量 | 必填 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | 是 | `.env` 或环境变量 |
| `SPIDER_OUTPUT_DIR` | 否 | 默认目录层级 |
| `TTS_INPUT_FILE` | 否 | 省略 `outputDir` 时覆盖默认 `input.txt` |

---

## 3. 只要口播字符串；或本地把正文变成 WebVTT（不经 DeepSeek）

**用法 A — 仅字符串**

```ts
import { generateVideoScriptText } from '@panda-video-generator/caption-generator';

const text = await generateVideoScriptText({ title, content, answers });
```

返回 `Promise<string | null>`（空响应 `null`）。**不落盘**。

**用法 B — 正文 → 估算 WebVTT（本地规则，不需要密钥）**

```ts
import { scriptToEstimatedWebVtt } from '@panda-video-generator/caption-generator/webvtt';

const vtt = scriptToEstimatedWebVtt(scriptText[, secPerChar]);
```

默认 `secPerChar = 0.12`；按**空行分段**，每段约 `clamp(2, 12, 字数 * secPerChar)` 秒。

**输入**

| 用法 | 说明 |
|------|------|
| A | Payload |
| B | 任意口播字符串 + 可选 `secPerChar` |

**输出**

| 用法 | 输出 |
|------|------|
| A | 仅返回值 |
| B | 仅 WebVTT 字符串 |

**环境变量**

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | 仅 **用法 A** 需要 |
