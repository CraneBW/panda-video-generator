#!/usr/bin/env node

/**
 * Daily News Generator (Kimi)
 * Uses Kimi API (Moonshot) with optional $web_search tool for daily news summary
 * Usage: tsx spider/news-generator-kimi.ts [date]
 * No extra dependencies - uses native fetch only.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { OUTPUT_DIRS, TTS_PATHS, VIDEO_PATHS, PUBLIC_DIRS } from '../types/paths';

const KIMI_API_BASE = process.env.KIMI_API_BASE_URL ?? 'https://api.moonshot.cn/v1';
const KIMI_CHAT_URL = `${KIMI_API_BASE}/chat/completions`;

interface KimiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: Array<{
    index: number;
    id: string;
    type: string;
    function: { name: string; arguments?: string };
  }>;
  tool_call_id?: string;
}

interface KimiChoice {
  index: number;
  message: KimiMessage;
  finish_reason: string;
}

interface KimiResponse {
  id?: string;
  choices?: KimiChoice[];
  usage?: { total_tokens: number };
}

/**
 * Load API key from .env.local or .env
 */
function loadApiKey(): void {
  const envFiles = ['.env.local', '.env'];
  for (const name of envFiles) {
    if (process.env.KIMI_API_KEY) break;
    const envPath = resolve(process.cwd(), name);
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        if (line.startsWith('KIMI_API_KEY=')) {
          process.env.KIMI_API_KEY = line.split('=')[1].trim();
          break;
        }
      }
    } catch {
      // try next file
    }
  }
}

function formatDateChinese(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日 ${weekday}`;
}

function formatDateSimple(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * Call Kimi chat completions API (non-streaming)
 */
async function kimiChat(messages: KimiMessage[], useTools: boolean): Promise<KimiResponse> {
  const body: Record<string, unknown> = {
    model: 'kimi-k2-turbo-preview',
    messages,
    temperature: 0.6,
    max_tokens: 32768,
    top_p: 1,
    stream: false,
  };
  if (useTools) {
    body.tools = [
      {
        type: 'builtin_function',
        function: { name: '$web_search' },
      },
    ];
  }

  const res = await fetch(KIMI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kimi API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<KimiResponse>;
}

/**
 * Generate daily news using Kimi (with optional web_search tool)
 */
export async function generateDailyNewsKimi(
  targetDate?: Date,
  outputDir: string = OUTPUT_DIRS.TTS
): Promise<string | null> {
  loadApiKey();

  if (!process.env.KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY is not set. Set it in .env.local or environment.');
  }

  const date = targetDate ?? new Date();
  const formattedDate = formatDateChinese(date);
  const isoDate = date.toISOString().split('T')[0];

  console.log(`\n📅 Kimi news summary for: ${formattedDate} (${isoDate})`);

  const userPrompt = `搜索一下今天的新闻，列出 1 到 10 条，每一条加一段 50–100 字的描述。

然后请将这 10 条新闻整理成一段完整的视频播报台词，严格按以下格式输出：
- 第一行：简短的问候和日期介绍（例如："大家好，今天是${formattedDate}，为您带来今日要闻"）
- 第二行：空行
- 接下来 10 行：每条新闻单独一行，格式为"数字. 新闻内容"（例如："1. 十四届全国人大四次会议上午开幕，会期 8 天..."）
- 每条新闻内容需要完整、详细、流畅，50–100 字，适合朗读
- 倒数第二行：空行
- 最后一行：结束语（例如："以上就是今天的新闻，感谢收看"）
- 不要添加其他标记符号（如书名号、括号、星号等）
- 总字数控制在 1600–2000 字`;

  const systemContent =
    'You are a helpful assistant. Generate accurate, objective daily news summaries in Chinese for video broadcast. Output only the video script in the exact format requested, with no extra commentary.';

  let messages: KimiMessage[] = [
    { role: 'system', content: systemContent },
    { role: 'user', content: userPrompt },
  ];

  let scriptText: string | null = null;
  let useTools = true;
  const maxRound = 3;
  let round = 0;

  while (round < maxRound) {
    round++;
    console.log(`\n📝 Requesting Kimi (round ${round}, tools=${useTools})...`);

    const resp = await kimiChat(messages, useTools);
    const choice = resp.choices?.[0];
    const msg = choice?.message;

    if (!msg) {
      console.warn('⚠️  No message in Kimi response');
      break;
    }

    if (msg.content && msg.content.trim()) {
      scriptText = msg.content.trim();
      console.log('✅ Got script from Kimi');
      break;
    }

    if (msg.tool_calls?.length && useTools) {
      // Append assistant message with tool_calls
      messages.push({
        role: 'assistant',
        content: msg.content ?? '',
        tool_calls: msg.tool_calls,
      });
      // Append placeholder tool result for each tool_call (API may accept and continue)
      for (const tc of msg.tool_calls) {
        messages.push({
          role: 'tool',
          content: JSON.stringify({
            search_result: { search_id: 'placeholder' },
            usage: { total_tokens: 0 },
          }),
          tool_call_id: tc.id,
        });
      }
      continue;
    }

    // No content and no tool_calls (or tools disabled) - fallback without tools
    if (useTools) {
      useTools = false;
      messages = [
        { role: 'system', content: systemContent },
        { role: 'user', content: userPrompt },
      ];
      continue;
    }
    break;
  }

  if (!scriptText) {
    console.warn('⚠️  No script content from Kimi after retries');
    return null;
  }

  const scriptPath =
    outputDir === OUTPUT_DIRS.TTS ? TTS_PATHS.INPUT : `${outputDir}/input.txt`;

  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }

  await fs.writeFile(scriptPath, scriptText, 'utf-8');
  console.log(`\n✅ News script saved: ${scriptPath}`);
  console.log('\n--- Preview ---');
  console.log(scriptText.substring(0, 500) + (scriptText.length > 500 ? '...' : ''));

  const simpleDateFormat = formatDateSimple(date);
  const videoTitle = `${simpleDateFormat}\n熊猫快闻`;
  const titleJsonPath = resolve(process.cwd(), VIDEO_PATHS.TITLE_JSON);
  const publicTitleJsonPath = resolve(process.cwd(), VIDEO_PATHS.PUBLIC_TITLE_JSON);

  await fs.mkdir(resolve(process.cwd(), OUTPUT_DIRS.VIDEO), { recursive: true });
  await fs.writeFile(
    titleJsonPath,
    JSON.stringify({ title: videoTitle }, null, 2),
    'utf-8'
  );
  console.log(`\n📄 Title JSON: ${titleJsonPath} (${videoTitle})`);

  try {
    await fs.mkdir(resolve(process.cwd(), PUBLIC_DIRS.VIDEO), { recursive: true });
    await fs.copyFile(titleJsonPath, publicTitleJsonPath);
    console.log(`📋 Copied to: ${publicTitleJsonPath}`);
  } catch (e) {
    console.error('⚠️  Copy title.json failed:', e);
  }

  const metadataPath = `${outputDir}/news-metadata.json`;
  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      {
        date: isoDate,
        formattedDate,
        generatedAt: new Date().toISOString(),
        scriptPath,
        title: videoTitle,
        source: 'kimi',
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`\n📊 Metadata: ${metadataPath}`);
  console.log('\n💡 Next: pnpm render:video');

  return scriptPath;
}

async function main() {
  const dateArg = process.argv[2];
  let targetDate: Date | undefined;

  if (dateArg) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
      console.error('❌ Invalid date. Use YYYY-MM-DD');
      process.exit(1);
    }
    targetDate = new Date(dateArg);
    if (isNaN(targetDate.getTime())) {
      console.error('❌ Invalid date');
      process.exit(1);
    }
  }

  console.log('🗞️  Daily News Generator (Kimi)');
  console.log('==============================\n');

  try {
    await generateDailyNewsKimi(targetDate);
    console.log('\n✅ Done.');
  } catch (err) {
    console.error('❌ Error:', err);
    if (err instanceof Error && err.message.includes('KIMI_API_KEY')) {
      console.error('\n提示: 请在 .env.local 中设置 KIMI_API_KEY');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default generateDailyNewsKimi;
