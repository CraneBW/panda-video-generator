# @panda-video-generator/spider

**Public contract:** one JSON object with **`title`** and **`content`** (strings only).

**Lightweight extract (env-only, no CLI args):**

| Script | Input |
|--------|--------|
| `pnpm spider:extract:file` | Local **UTF-8 text file** (any extension) |
| `pnpm spider:extract:url` | Any **http(s)** page (`SPIDER_SOURCE` = URL) |

**Local file title rule:** if the first non-empty line is `# Heading` (Markdown-style ATX), that line is the title and the rest is `content`; otherwise `title` is the **filename without extension** and `content` is the **entire file**.

**Zhihu full pipeline** (crawl + captions + repo paths): **`pnpm spider:zhihu -- <url>`** — unchanged; separate from the extract commands above.

## Shared environment variables

| Variable | Required | Meaning |
|----------|----------|---------|
| `SPIDER_SOURCE` | Yes | **`extract:file`:** path to UTF-8 text file. **`extract:url`:** full page URL |
| `SPIDER_OUTPUT_DIR` | Yes | Target directory for the JSON file (created if missing; relative to cwd ok) |
| `SPIDER_OUTPUT_FILENAME` | No | Default `output.json` |

## Examples

```bash
# Plain text, .txt, .md, script, etc.
SPIDER_SOURCE=docs/notes.txt \
SPIDER_OUTPUT_DIR=./out \
SPIDER_OUTPUT_FILENAME=article.json \
pnpm spider:extract:file

# Any page → ./out/page.json
SPIDER_SOURCE=https://example.com/blog/post \
SPIDER_OUTPUT_DIR=./out \
SPIDER_OUTPUT_FILENAME=page.json \
pnpm spider:extract:url
```

JSON shape:

```json
{
  "title": "...",
  "content": "..."
}
```

## Other spider-related env (crawl / CI)

- `PUPPETEER_EXECUTABLE_PATH` — custom Chromium for browser-backed extract (`extract:url`)
- `SPIDER_SAVE_DEBUG=1` — write debug HTML/PNG under spider output dir during crawl

## Layout

| Path | Role |
|------|------|
| `extract-json.ts` | `parseTextFileToSpiderJson` / `extractPageUrlToSpiderJson` → `{ title, content }` |
| `cli-extract-text-file-json.ts` | `pnpm spider:extract:file` |
| `cli-extract-page-url-json.ts` | `pnpm spider:extract:url` |
| `generic-url-spider.ts` | `GenericPageSpider` (Puppeteer) |
| `zhihu/` | Zhihu wrapper + `pnpm spider:zhihu` video-prep CLI |

## License

See the LICENSE file in the repository root.
