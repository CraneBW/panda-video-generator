# Zhihu Spider

A tool to extract main content from Zhihu question pages.

## Installation

Install dependencies:

```bash
pnpm add openai puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
pnpm add -D tsx @types/node
```

**Note**: The stealth plugin helps bypass anti-bot detection. The tool includes:
- Stealth plugin to hide automation indicators
- Random delays to simulate human behavior
- Human-like scrolling patterns
- Realistic browser headers

## Usage

### Using npm script (Recommended)

```bash
# Extract content from a Zhihu question URL
pnpm spider <url>

# Example
pnpm spider https://www.zhihu.com/question/1999774552750778199

# Save as Markdown
pnpm spider <url> markdown
```

### Using tsx directly

```bash
# Extract content from a Zhihu question URL
npx tsx spider/run.ts <url>

# Example
npx tsx spider/run.ts https://www.zhihu.com/question/1999774552750778199

# Save as Markdown
npx tsx spider/run.ts <url> markdown
```

### Output Formats

- **JSON** (default): Structured data with question title, content, and answers
- **Markdown**: Human-readable format with formatted question and answers

### Programmatic Usage

```typescript
import { ZhihuSpider } from './spider/spider';

const spider = new ZhihuSpider();
await spider.init();

const data = await spider.extractQuestion('https://www.zhihu.com/question/1999774552750778199');

console.log(data.title);
console.log(data.content);
console.log(data.answers);

await spider.close();
```

## Output

The tool extracts:
- Question title
- Question content/description
- Answers (author, content, vote count)

Output files are saved in the `output/spider/` directory with timestamps:
- JSON format: `output/spider/output-{timestamp}.json`
- Markdown format: `output/spider/output-{timestamp}.md`

## Video Script Generation

After successfully extracting content, the tool automatically sends the data to DeepSeek AI to generate a video script. The script generation is handled by `caption-generator.ts`.

The generated caption file is saved as `output/tts/input.txt` and is ready to be used directly with the TTS tool.

### Using Caption Generator Separately

You can also use the caption generator independently:

```typescript
import { generateVideoScript, generateVideoScriptFromFile } from './spider/caption-generator';

// Generate script from data object (saves to output/tts/input.txt by default)
const scriptPath = await generateVideoScript(zhihuData);

// Or specify custom output directory
const scriptPath = await generateVideoScript(zhihuData, 'custom/dir');

// Generate script from JSON file
const scriptPath = await generateVideoScriptFromFile('output/spider/output-2026-01-28T15-35-48.json');
```

### Requirements

- Set `DEEPSEEK_API_KEY` in `.env.local` file
- The script will be saved as `output/tts/input.txt` (fixed filename for TTS compatibility)

### Complete Workflow

1. **Extract content from Zhihu**: `pnpm spider <url>`
   - Extracts question and answers
   - Automatically generates video script using DeepSeek AI
   - Saves caption to `output/tts/input.txt`

2. **Generate audio with TTS**: `python tts/tts.py output/tts/input.txt output/tts`
   - Reads from `output/tts/input.txt`
   - Generates `audio.mp3` and `audio.vtt` files in `output/tts/`

3. **Use in Remotion video**: The generated audio and VTT files can be used directly in your Remotion composition.
