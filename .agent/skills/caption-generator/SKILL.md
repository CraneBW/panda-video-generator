---
name: caption-generator
description: >-
  Prefer the hosting AI Agent to write narration into input.txt from crawl JSON (no external LLM).
  Fallback only: pnpm caption:env / generateVideoScript* (DeepSeek or Kimi) + optional WebVTT estimate.
  Triggers: 口播, input.txt, captions.vtt, LLM_PROVIDER, DEEPSEEK, MOONSHOT, KIMI.
---

# Caption Generator — 三种用法（输入 / 输出 / 环境变量）

## Agent 使用优先级（必读）

1. **优先 — 由当前 AI Agent 直接出稿**  
   若任务由 AI Agent 执行（Cursor、Claude Code、Copilot、OpenClaw 等），**应优先让 Agent 根据爬虫 JSON**（或等价的 `title` / `content` / `answers`）**自行撰写口播正文**，并写入 **`output/spider/input.txt`**（或用户配置的 **`TTS_INPUT_FILE`**）。**不要**为此先调用包内 DeepSeek/Kimi 接口，以减少对外部 API、密钥和计费的依赖。

2. **兜底 — 再使用本包 LLM**  
   **仅当** Agent **无法**可靠完成口播撰稿（例如会话/策略限制长文本输出、用户明确要求只走仓库 CLI、或需在无 Agent 的环境里批处理）时，再使用下文的 **`pnpm caption:env`**、`generateVideoScript` / `generateVideoScriptFromFile` / `generateVideoScriptText`。

3. **与模板口径一致（Agent 撰稿时）**  
   自行撰写的口播，建议在风格与硬约束上对齐仓库内 **[`packages/caption-generator/video-script-prompts.ts`](../../packages/caption-generator/video-script-prompts.ts)**（开场与收束、分段与字数上限、避免不宜上屏的符号等）。不需要走 LLM 时，仍可用 **用法 B**（`scriptToEstimatedWebVtt`）在本地从纯文本生成估算 WebVTT。

---

在 **monorepo 根目录**执行（`cwd` 影响路径；见下文 **LLM 提供商**）。以下 **LLM 路径为兜底**；`loadCaptionLlmEnvFromDotenv` 会把仓库根 **`.env`** 里列出的 LLM 键写入 `process.env`，**同名字段以 `.env` 为准**（含 `LLM_PROVIDER`）。不负责爬取。`packages/caption-generator/README.md` 仅为路牌链回本文。

**Payload**（凡调 LLM）：`title` 非空，且 **`content` 或 `answers` 至少一方有内容**（`answers` 非数组视为 `[]`，此时须 **`content`**）。可带 `sourceUrl`，不参与模型。

```ts
{
  title: string;
  content: string;
  answers: Array<{ author: string; content: string; voteCount: number }>;
}
```

---

## LLM 提供商（默认 DeepSeek，可选 Kimi）

DeepSeek 默认值与官方一致：[API 文档](https://api-docs.deepseek.com/)（`base_url` `https://api.deepseek.com`，模型 `deepseek-chat`）；代码中写死为默认，可用下表变量覆盖。

Kimi 默认与常见官方示例一致：`base_url` **`https://api.moonshot.cn/v1`**，模型 **`kimi-k2.5`**（国内控制台密钥通常走 `.cn`；若你的密钥面向 **`https://api.moonshot.ai/v1`**，请设 `MOONSHOT_API_BASE_URL`）。[文档入口](https://platform.moonshot.ai/docs/api-reference)。

| 变量 | 必填 | 说明 |
|------|------|------|
| `LLM_PROVIDER` | 否 | 默认 `deepseek`。设为 `kimi` 或 `moonshot` 时使用 **Moonshot**（Kimi）OpenAI 兼容接口。 |
| `DEEPSEEK_API_KEY` | 默认提供商时必填 | `LLM_PROVIDER` 未设或为 `deepseek` 时使用。 |
| `DEEPSEEK_API_BASE_URL` | 否 | DeepSeek API 根地址；默认 **`https://api.deepseek.com`**（也可用文档中的 `https://api.deepseek.com/v1`）。 |
| `DEEPSEEK_MODEL` | 否 | DeepSeek 模型名；默认 **`deepseek-chat`**。 |
| `MOONSHOT_API_KEY` 或 `KIMI_API_KEY` | 选 Kimi 时必填 | 与 `LLM_PROVIDER=kimi`（或 `moonshot`）二选一填写即可（优先 `MOONSHOT_API_KEY`）。 |
| `MOONSHOT_API_BASE_URL` | 否 | Kimi API 根地址；默认 **`https://api.moonshot.cn/v1`**。 |
| `MOONSHOT_MODEL` | 否 | Kimi 聊天模型名；默认 **`kimi-k2.5`**。 |
| `CAPTION_LLM_MODEL` | 否 | **Kimi**：若未设 `MOONSHOT_MODEL`，此项可覆盖模型。**DeepSeek**：若未设 `DEEPSEEK_MODEL`，此项可覆盖模型。 |
| `CAPTION_LLM_BASE_URL` | 否 | **Kimi**：若未设 `MOONSHOT_API_BASE_URL`，此项可覆盖 base。**DeepSeek**：若未设 `DEEPSEEK_API_BASE_URL`，则此项可覆盖 base（兼容旧配置）。 |

程序化解析：`import { getCaptionLlmConfig } from '@panda-video-generator/caption-generator'` 或 `@panda-video-generator/caption-generator/llm-config`。

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
| 见上文 **LLM 提供商** | 按所选提供商 | 默认 DeepSeek：`DEEPSEEK_API_KEY` |

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
| 见上文 **LLM 提供商** | 按所选提供商 | 默认需 `DEEPSEEK_API_KEY` |
| `SPIDER_OUTPUT_DIR` | 否 | 默认目录层级 |
| `TTS_INPUT_FILE` | 否 | 省略 `outputDir` 时覆盖默认 `input.txt` |

---

## 3. 只要口播字符串；或本地把正文变成 WebVTT（不经云端 LLM）

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
| 见上文 **LLM 提供商** | 仅 **用法 A** 需要 |
