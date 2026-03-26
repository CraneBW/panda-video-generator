# Spider & Content Generation Tools

This directory contains content scraping and AI generation tools for automated video content creation.

## Available Tools

### 1. Zhihu Question Spider (spider-zhihu.ts)

Extract content from Zhihu question pages and generate video scripts.

**Usage:**

```bash
# Using pnpm command
pnpm spider:zhihu -- https://www.zhihu.com/question/316150890

# Or run script directly
sh scripts/spider-zhihu.sh https://www.zhihu.com/question/316150890

# Or use tsx
tsx spider/spider-zhihu.ts https://www.zhihu.com/question/316150890
```

**Features:**
- Scrape Zhihu question titles, content, and answers
- Generate video narration scripts using DeepSeek AI
- Automatically create TTS input files and title.json
- Output files saved to `output/tts/` and `output/video/`

### 2. RSS Title Spider & Translator (rss-title-translator.ts)

根据提供的 RSS 地址列表批量抓取条目的**标题**和 **guid**，并用 DeepSeek 将标题翻译为中文，仅输出标题（含 guid 映射）。

**用法：**

```bash
# 使用默认 RSS 源（脚本内 DEFAULT_RSS_FEEDS）
pnpm spider:rss

# 指定一个或多个 RSS 地址
pnpm spider:rss -- https://feeds.bbci.co.uk/news/rss.xml https://rss.nytimes.com/services/xml/rss/nyt/World.xml

# 或直接运行
tsx spider/rss-title-translator.ts [rss_url1] [rss_url2] ...
```

**功能：**
- 从多个 RSS 源批量获取条目的 `title` 和 `guid`（无正文）
- 调用 DeepSeek 将标题翻译成中文
- 输出：每条 `guid` 与翻译后的标题；最后单独输出「仅标题」列表便于复制
- **去重**：使用静态 JSON 文件 `spider/rss-seen-guids.json` 记录已处理过的 guid，每次只抓取并翻译**新条目**，已存在记录会被忽略

**依赖：** 需在 `.env.local` 中配置 `DEEPSEEK_API_KEY`。

### 3. 单页文章爬取并生成视频文稿 + VTT（article-summary-vtt.ts）

抓取指定文章页正文，用 DeepSeek 生成与 `caption-generator` 同风格的视频台词（开场白 + 正文 + 结尾语），并写入 TTS 目录供后续 TTS 与视频生成使用。

**用法：**

```bash
pnpm spider:article-vtt -- "https://thehackernews.com/2026/03/transparent-tribe-uses-ai-to-mass.html"
# 或不带 URL（使用脚本内默认链接）
pnpm spider:article-vtt
```

**功能：**
- 使用 Puppeteer 打开文章 URL，提取正文（通用新闻/博客选择器）
- 调用 DeepSeek 生成完整视频文稿：开场白、正文（贴近原文、分段友好）、结尾语，总字数不超过 1200 字，每段不超过 50 字，无额外符号
- 文稿保存到 **`output/tts/input.txt`**（与 caption-generator 一致，供 TTS 使用）
- 根据文稿分段生成 WebVTT 并保存到 **`output/tts/audio.vtt`**（预估时间轴，与 TTS 输出同目录，供后续视频生成）

**依赖：** `DEEPSEEK_API_KEY`、Puppeteer。

## Configuration Requirements

### Environment Variables

Create a `.env.local` file in the project root:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

### Install Dependencies

```bash
pnpm install
```

Key dependencies:
- `openai` - DeepSeek API client
- `puppeteer-extra` - Browser automation (Zhihu spider)
- `puppeteer-extra-plugin-stealth` - Anti-detection

## Workflow

### Complete Video Generation Flow

1. **Generate Content Script**
   ```bash
   # Choose one:
   pnpm spider:zhihu -- <url>      # Zhihu
   pnpm spider:article-vtt -- <url> # Single-article page
   ```

2. **Generate Video**
   ```bash
   pnpm render:video
   ```

3. **Upload to Platforms** (Optional)
   ```bash
   pnpm test:upload:bilibili
   pnpm test:upload:douyin
   # etc...
   ```

## Output File Structure

```
output/
├── tts/
│   ├── input.txt              # Video script (for TTS)
│   ├── audio.mp3              # Generated audio (TTS output)
│   └── audio.vtt              # Subtitle file (TTS output)
├── video/
│   ├── title.json             # Video title
│   ├── video.mp4              # Final video (render output)
│   └── cover.jpg              # Video cover (render output)
└── spider/
    └── output-*.json          # Raw scraped data (Zhihu spider)
```

## Core Files

- `spider.ts` - ZhihuSpider class definition
- `spider-zhihu.ts` - Zhihu spider main program
- `caption-generator.ts` - DeepSeek video script generator (used by Zhihu)

## Tech Stack

- **Node.js/TypeScript** - Runtime and language
- **Puppeteer** - Web scraping
- **DeepSeek API** - AI content generation
- **Remotion** - Video rendering engine

## Notes

1. **API Key Security**: Do not commit `.env.local` to version control
2. **Scraping Etiquette**: Zhihu spider includes random delays to simulate human behavior
3. **Content Review**: Generated content may require manual review
4. **Network Requirements**: Stable internet connection required for DeepSeek API

## Troubleshooting

### DeepSeek API Error

```bash
❌ Error: DEEPSEEK_API_KEY is not set
```

**Solution**: Set `DEEPSEEK_API_KEY` in `.env.local`

### Zhihu Spider Failure

```bash
❌ Error: Failed to extract content
```

**Possible Causes**:
- Network connection issues
- Zhihu page structure changes
- Anti-scraping detection

**Solutions**: 
- Check debug files: `output/spider/debug-*.png` and `debug-*.html`
- Increase delay times
- Update selectors

## Development & Extension

### Adding New Content Sources

Follow the implementation patterns in `spider-zhihu.ts` and `article-summary-vtt.ts`:

1. Create new spider/generator file
2. Use DeepSeek API to generate scripts
3. Output to standard path (`output/tts/input.txt`)
4. Add commands to `package.json`

### Customizing Prompts

Edit the `userPrompt` variable in the respective files to adjust AI-generated content style.

## License

See LICENSE file in project root.
