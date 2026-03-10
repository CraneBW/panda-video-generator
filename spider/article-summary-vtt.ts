#!/usr/bin/env node

/**
 * Article Page Spider & Video Script + VTT
 * Fetches a single article page, extracts content, generates video script (like caption-generator)
 * with intro + content + ending, saves to output/tts/ for later TTS and video generation.
 *
 * Outputs:
 *   - output/tts/input.txt      (video script for TTS)
 *   - output/tts/audio.vtt     (WebVTT from script, estimated timings)
 *   - output/video/title.json  (article title for video; also copied to public/video/)
 *
 * Usage:
 *   pnpm spider:article-vtt -- https://thehackernews.com/2026/03/transparent-tribe-uses-ai-to-mass.html
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Page } from 'puppeteer';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { OUTPUT_DIRS, TTS_PATHS, VIDEO_PATHS, PUBLIC_DIRS } from '../types/paths';

puppeteer.use(StealthPlugin());

/** Approximate seconds per character for Chinese TTS (for VTT timing). */
const SEC_PER_CHAR = 0.12;

function loadApiKey(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      if (line.startsWith('DEEPSEEK_API_KEY=')) {
        process.env.DEEPSEEK_API_KEY = line.split('=')[1].trim();
        break;
      }
    }
  } catch {
    // use process.env
  }
}

/**
 * Extract main article text from a loaded page (generic news/article selectors).
 */
async function extractArticleText(page: Page): Promise<{ title: string; body: string }> {
  return page.evaluate(() => {
    const selectors = [
      'article .post-content',
      'article .articlebody',
      'article .content',
      '.post-content',
      '.article-body',
      '.article-content',
      '[class*="post-content"]',
      '[class*="article-body"]',
      'article',
      'main',
    ];
    let body = '';
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const text = el.textContent?.trim() || '';
      if (text.length > 100 && text.length > body.length) {
        body = text;
      }
    }
    if (!body) {
      const p = document.querySelectorAll('p');
      const parts: string[] = [];
      p.forEach((e) => {
        const t = e.textContent?.trim();
        if (t && t.length > 20) parts.push(t);
      });
      body = parts.join('\n\n');
    }
    const titleEl = document.querySelector('h1') || document.querySelector('title');
    const title = titleEl?.textContent?.trim() || '';
    return { title: title.slice(0, 200), body: body.slice(0, 12000) };
  });
}

/**
 * Generate video script from article (same style as caption-generator: intro + content + ending).
 * Returns full script text for input.txt and later TTS/video.
 */
async function generateVideoScript(
  openai: OpenAI,
  title: string,
  body: string
): Promise<string> {
  const userPrompt = `请根据以下英文文章内容，整理并生成一段完整的视频台词。

文章标题：
${title}

文章正文：
${body.slice(0, 10000)}

要求：
1. 在内容前加入一段简短开场白，在内容后加入一段结尾语。
2. 正文部分尽可能贴近原文要点，用中文重新组织，适合朗读和字幕展示。
3. 不要添加任何额外标记和符号（如书名号、括号、星号等），不要编号。
4. 根据聆听和阅读的友好性分段，每段不超过50个字，让内容流畅自然。
5. 最终总字数不超过1200字。
6. 只输出生成的台词正文，不要任何解释或说明。`;

  const completion = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content:
          '你是一名视频文稿撰写助手。根据给定的文章生成适合配音和字幕的完整视频台词，包含开场白、正文和结尾语，语言自然流畅。',
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    temperature: 0.4,
  });
  const scriptText = completion.choices[0]?.message?.content?.trim();
  if (!scriptText) throw new Error('DeepSeek returned no video script.');
  return scriptText;
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Build WebVTT from script text: split by paragraphs, assign duration by character count.
 */
function scriptToVtt(scriptText: string): string {
  const paragraphs = scriptText
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const lines: string[] = ['WEBVTT', ''];
  let start = 0;
  for (const para of paragraphs) {
    const duration = Math.max(2, Math.min(12, para.length * SEC_PER_CHAR));
    const end = start + duration;
    lines.push(`${formatVttTime(start)} --> ${formatVttTime(end)}`);
    lines.push(para);
    lines.push('');
    start = end;
  }
  return lines.join('\n');
}


export async function runArticleSummaryVtt(articleUrl: string): Promise<string> {
  loadApiKey();
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not set. Set it in .env.local or environment.');
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    console.log('Fetching:', articleUrl);
    await page.goto(articleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const { title, body } = await extractArticleText(page);

    if (!body || body.length < 50) {
      throw new Error('Could not extract enough article content from page.');
    }
    console.log('Title:', title.slice(0, 80) + (title.length > 80 ? '...' : ''));
    console.log('Body length:', body.length, 'chars');

    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });
    console.log('Generating video script with DeepSeek (intro + content + ending)...');
    const scriptText = await generateVideoScript(openai, title, body);

    const ttsDir = resolve(process.cwd(), OUTPUT_DIRS.TTS);
    await fs.mkdir(ttsDir, { recursive: true });

    const scriptPath = resolve(process.cwd(), TTS_PATHS.INPUT);
    await fs.writeFile(scriptPath, scriptText, 'utf-8');
    console.log('Script saved:', scriptPath);

    const vttContent = scriptToVtt(scriptText);
    const vttPath = resolve(process.cwd(), TTS_PATHS.AUDIO_VTT);
    await fs.writeFile(vttPath, vttContent, 'utf-8');
    console.log('VTT saved:', vttPath);

    if (title) {
      const titleJsonPath = resolve(process.cwd(), VIDEO_PATHS.TITLE_JSON);
      const publicTitleJsonPath = resolve(process.cwd(), VIDEO_PATHS.PUBLIC_TITLE_JSON);
      const videoTitle = title.length > 80 ? title.slice(0, 77) + '...' : title;
      try {
        await fs.mkdir(resolve(process.cwd(), OUTPUT_DIRS.VIDEO), { recursive: true });
        await fs.writeFile(
          titleJsonPath,
          JSON.stringify({ title: videoTitle }, null, 2),
          'utf-8'
        );
        console.log('Title JSON saved:', titleJsonPath);
        await fs.mkdir(resolve(process.cwd(), PUBLIC_DIRS.VIDEO), { recursive: true });
        await fs.writeFile(
          publicTitleJsonPath,
          JSON.stringify({ title: videoTitle }, null, 2),
          'utf-8'
        );
        console.log('Title JSON copied to:', publicTitleJsonPath);
      } catch (e) {
        console.warn('Failed to write title.json:', e);
      }
    }

    console.log('Next: run TTS (e.g. pnpm render:video) to generate audio and final video.');
    return vttPath;
  } finally {
    await browser.close();
  }
}

async function main() {
  const defaultUrl = 'https://thehackernews.com/2026/03/transparent-tribe-uses-ai-to-mass.html';
  const url = process.argv.slice(2).find((a) => a.startsWith('http')) || defaultUrl;
  console.log('Article Summary to VTT');
  console.log('URL:', url);
  try {
    await runArticleSummaryVtt(url);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default runArticleSummaryVtt;
