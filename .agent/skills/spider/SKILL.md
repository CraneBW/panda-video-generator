---
name: spider
description: >-
  Atomic reference for three spider flows: spider:extract:file, spider:extract:url, spider:zhihu —
  inputs, outputs, env vars only.
---

# Spider — 三种用法（输入 / 输出 / 环境变量）

在 **monorepo 根目录**执行（`cwd` 影响相对路径；DeepSeek 相关见仓库根 **`.env`**）。`packages/spider/README.md` 仅为路牌链回本文。

---

## 1. 本地 UTF-8 文件 → `{ title, content }` JSON

**用法**

```bash
SPIDER_SOURCE=<相对或绝对路径> \
[SPIDER_OUTPUT_FILENAME=<文件名>] \
pnpm spider:extract:file
```

自定义输出目录（此时 **`SPIDER_OUTPUT_DIR` 必填**）：

```bash
SPIDER_SOURCE=<路径> \
SPIDER_OUTPUT_DIR=<目录> \
[SPIDER_OUTPUT_FILENAME=<文件名>] \
pnpm exec tsx packages/spider/cli-extract-text-file-json.ts
```

**输入**

| 项目 | 说明 |
|------|------|
| `SPIDER_SOURCE` | 本地 UTF-8 文本/Markdown 等文件路径（相对 **cwd**） |
| 标题推导 | 首条非空行为 `# 标题` → 该行为 title、余下为 content；否则 title = 文件名去扩展名，content = 全文 |

**输出**

| 路径 | 内容 |
|------|------|
| `<SPIDER_OUTPUT_DIR>/<SPIDER_OUTPUT_FILENAME>` | JSON：`{ "title": string, "content": string }` |

`pnpm spider:extract:file` 通过脚本 **固定** `SPIDER_OUTPUT_DIR=output/spider`。走 `tsx …cli-extract-text-file-json.ts` 时目录由你设定。

**环境变量**

| 变量 | 必填 | 默认值 / 说明 |
|------|------|----------------|
| `SPIDER_SOURCE` | 是 | 文件路径 |
| `SPIDER_OUTPUT_DIR` | 用 `pnpm spider:extract:file` 时不必设（脚本设为 `output/spider`）；用 **直接 tsx** 时 **是** | — |
| `SPIDER_OUTPUT_FILENAME` | 否 | `output.json` |

---

## 2. http(s) 页面 URL → `{ title, content }` JSON（Puppeteer）

**用法**

```bash
SPIDER_SOURCE=<https://…> \
[SPIDER_OUTPUT_FILENAME=<文件名>] \
pnpm spider:extract:url
```

自定义输出目录：

```bash
SPIDER_SOURCE=<https://…> \
SPIDER_OUTPUT_DIR=<目录> \
[SPIDER_OUTPUT_FILENAME=<文件名>] \
pnpm exec tsx packages/spider/cli-extract-page-url-json.ts
```

**输入**

| 项目 | 说明 |
|------|------|
| `SPIDER_SOURCE` | 完整 URL，须以 `http://` 或 `https://` 开头 |

**输出**

| 路径 | 内容 |
|------|------|
| `<SPIDER_OUTPUT_DIR>/<SPIDER_OUTPUT_FILENAME>` | JSON：`{ "title": string, "content": string }`（多回答会合并进 `content`） |

`pnpm spider:extract:url` **固定** `SPIDER_OUTPUT_DIR=output/spider`。

**环境变量**

| 变量 | 必填 | 默认值 / 说明 |
|------|------|----------------|
| `SPIDER_SOURCE` | 是 | 页面 URL |
| `SPIDER_OUTPUT_DIR` | 同「用法 1」 | — |
| `SPIDER_OUTPUT_FILENAME` | 否 | `output.json` |
| `PUPPETEER_EXECUTABLE_PATH` | 否 | 自定义 Chromium |
| `SPIDER_SAVE_DEBUG` | 否 | 设 `1` 时在 `SPIDER_OUTPUT_DIR`（未设则包内默认 `output/spider`）下写调试 PNG/HTML |

---

## 3. 知乎问题 URL → 结构化 JSON + 口播 + 标题同步

**用法**

```bash
pnpm spider:zhihu -- https://www.zhihu.com/question/<id>
```

或：

```bash
pnpm exec tsx packages/spider/zhihu/cli-zhihu-video-prep.ts https://www.zhihu.com/question/<id>
```

（`pnpm spider:zhihu` 会设 `SPIDER_OUTPUT_DIR=output/spider`。）

**输入**

| 项目 | 说明 |
|------|------|
| 第一个 CLI 参数 | 知乎问题 URL，须匹配 `https://www.zhihu.com/question/...` |

**输出**

| 路径 | 内容 |
|------|------|
| `<SPIDER_OUTPUT_DIR>/output.json` | `{ "title", "content", "answers": [...] }` |
| `<SPIDER_OUTPUT_DIR>/title.json` | `{ "title": string }` |
| `public/video/title.json` | 与上同内容的副本（供 Remotion） |
| `getTtsInputFile()` 解析路径（默认可为 `<SPIDER_OUTPUT_DIR>/input.txt`） | 口播正文；由 caption-generator 写入，`TTS_INPUT_FILE` 可覆盖 |

口播生成失败时：**`output.json` 等抓取结果仍可保留**（仅控制台告警）。

**环境变量**

| 变量 | 必填 | 默认值 / 说明 |
|------|------|----------------|
| `SPIDER_OUTPUT_DIR` | 否 | `pnpm spider:zhihu` 设为 `output/spider`；直接 tsx 未设时包内默认 `output/spider` |
| `DEEPSEEK_API_KEY` | 口播需要 | 环境变量或仓库根 `.env` |
| `TTS_INPUT_FILE` | 否 | 覆盖默认 `input.txt` 路径（caption-generator / `getTtsInputFile()`） |
| `PUPPETEER_EXECUTABLE_PATH` | 否 | 自定义 Chromium |
| `SPIDER_SAVE_DEBUG` | 否 | 设 `1` 时写调试 PNG/HTML（目录规则同用法 2） |
