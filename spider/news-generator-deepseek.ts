#!/usr/bin/env node

/**
 * Daily News Generator
 * Uses DeepSeek API to generate daily news summary for video script
 * Usage: tsx spider/news-generator.ts [date]
 */

import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { OUTPUT_DIRS, TTS_PATHS, VIDEO_PATHS, PUBLIC_DIRS } from '../types/paths';

interface NewsItem {
  title: string;
  description: string;
}

interface NewsData {
  date: string;
  newsItems: NewsItem[];
}

/**
 * Load API key from .env.local file
 */
function loadApiKey(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      if (line.startsWith('DEEPSEEK_API_KEY=')) {
        process.env.DEEPSEEK_API_KEY = line.split('=')[1].trim();
      }
    }
  } catch {
    // Use system env if .env.local not found
  }
}

/**
 * Format date to Chinese readable format (with weekday)
 * @param date - Date object
 * @returns Formatted date string
 */
function formatDateChinese(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const weekday = weekdays[date.getDay()];
  
  return `${year}年${month}月${day}日 ${weekday}`;
}

/**
 * Format date to Chinese simple format (without weekday)
 * @param date - Date object
 * @returns Formatted date string
 */
function formatDateSimple(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  return `${year}年${month}月${day}日`;
}

/**
 * Generate daily news summary using DeepSeek
 * @param targetDate - Target date for news (default: today)
 * @param outputDir - Output directory for the script file (default: OUTPUT_DIRS.TTS)
 * @returns Path to the generated script file
 */
export async function generateDailyNews(
  targetDate?: Date,
  outputDir: string = OUTPUT_DIRS.TTS
): Promise<string | null> {
  // Load API key
  loadApiKey();

  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not set. Please set it in .env.local file or environment variables.');
  }

  const date = targetDate || new Date();
  const formattedDate = formatDateChinese(date);
  const isoDate = date.toISOString().split('T')[0];

  console.log(`\n📅 Generating news summary for: ${formattedDate} (${isoDate})`);

  try {
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    const userPrompt = `请为我生成${formattedDate}（${isoDate}）的10条重要新闻摘要。

要求：
1. 选择当天最重要、最有影响力的10条新闻
2. 涵盖多个领域：国内时政、国际新闻、科技、经济、社会、文化等
3. 每条新闻包含：
   - 新闻标题（简洁明了，10-20字）
   - 新闻描述（60-100字，详细阐述新闻内容，包含背景、影响和意义）
4. 新闻内容要客观、准确、真实
5. 按重要性排序

最后，请将这10条新闻整理成一段完整的视频播报台词，要求：
- 第一行：简短的问候和日期介绍（例如："大家好，今天是${formattedDate}，为您带来今日要闻"）
- 第二行：空行
- 接下来10行：每条新闻单独一行，格式为"数字. 新闻内容"（例如："1. 我国成功发射..."）
- 每条新闻内容需要完整、详细、流畅，充分展开背景信息和影响分析
- 每条新闻应包含具体数据、关键人物、地点等细节信息
- 倒数第二行：空行
- 最后一行：结束语（例如："以上就是今天的新闻，感谢收看"）
- 语言自然流畅，内容丰富，适合朗读
- 不要添加其他标记符号（如书名号、括号、星号等）
- 每条新闻字数控制在80-120字
- 总字数控制在1600-2000字

请严格按照上述格式输出，每条新闻必须单独一行，前面带数字编号。内容要详实充分，有深度。`;

    console.log('\n📝 Sending request to DeepSeek for daily news generation...');
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are a professional news anchor and content creator. Generate accurate, objective daily news summaries in Chinese for video broadcast. Focus on real, important news from the specified date. Format the output as a smooth, natural video script suitable for text-to-speech and subtitle display.`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
    });

    const scriptText = completion.choices[0]?.message?.content;

    if (!scriptText) {
      console.warn('\n⚠️  No text content in DeepSeek response');
      return null;
    }

    // Use fixed filename for TTS compatibility
    const scriptPath = outputDir === OUTPUT_DIRS.TTS 
      ? TTS_PATHS.INPUT 
      : `${outputDir}/input.txt`;

    // Ensure output directory exists
    try {
      await fs.access(outputDir);
    } catch {
      await fs.mkdir(outputDir, { recursive: true });
    }

    // Save script to file
    await fs.writeFile(scriptPath, scriptText, 'utf-8');
    console.log(`\n✅ News script generated and saved to: ${scriptPath}`);
    console.log('\n--- Generated Script Preview ---');
    console.log(scriptText.substring(0, 500) + (scriptText.length > 500 ? '...' : ''));

    // Generate title.json with date
    const simpleDateFormat = formatDateSimple(date);
    const videoTitle = `${simpleDateFormat}\n熊猫快闻`;
    const titleJsonPath = resolve(process.cwd(), VIDEO_PATHS.TITLE_JSON);
    const publicTitleJsonPath = resolve(process.cwd(), VIDEO_PATHS.PUBLIC_TITLE_JSON);
    
    try {
      await fs.mkdir(resolve(process.cwd(), OUTPUT_DIRS.VIDEO), { recursive: true });
      await fs.writeFile(
        titleJsonPath,
        JSON.stringify({ title: videoTitle }, null, 2),
        'utf-8'
      );
      console.log(`\n📄 Title JSON exported: ${titleJsonPath}`);
      console.log(`   Title: ${videoTitle}`);
      
      // Also copy to public/video/ for Remotion Studio access
      await fs.mkdir(resolve(process.cwd(), PUBLIC_DIRS.VIDEO), { recursive: true });
      await fs.copyFile(titleJsonPath, publicTitleJsonPath);
      console.log(`📋 Title JSON also copied to: ${publicTitleJsonPath}`);
    } catch (error) {
      console.error('⚠️  Failed to generate title.json:', error);
    }

    // Save metadata
    const metadataPath = `${outputDir}/news-metadata.json`;
    const metadata = {
      date: isoDate,
      formattedDate,
      generatedAt: new Date().toISOString(),
      scriptPath,
      title: videoTitle,
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`\n📊 Metadata saved to: ${metadataPath}`);

    console.log('\n📁 Output files:');
    console.log(`  - Script: ${scriptPath}`);
    console.log(`  - Title JSON: ${titleJsonPath}`);
    console.log(`  - Metadata: ${metadataPath}`);
    console.log('\n💡 Next step: Run \'pnpm render:video\' to generate video from the news script');

    return scriptPath;
  } catch (error) {
    console.error('\n❌ Error generating daily news with DeepSeek:', error);
    if (error instanceof Error && (error.message.includes('API key') || error.message.includes('DEEPSEEK_API_KEY'))) {
      console.error('\n提示: 请在 .env.local 文件中设置 DEEPSEEK_API_KEY');
    }
    throw error;
  }
}

/**
 * Main function - CLI entry point
 */
async function main() {
  console.error('⚠️  提示：DeepSeek 当前不支持联网检索新闻。请暂时使用 Kimi 版本（命令：pnpm generate:news:kimi）');
  process.exit(1);



  // Parse date argument (format: YYYY-MM-DD)
  const dateArg = process.argv[2];
  let targetDate: Date | undefined;

  if (dateArg) {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
      console.error('❌ Error: Invalid date format');
      console.error('Expected format: YYYY-MM-DD');
      console.error('Example: 2026-03-02');
      process.exit(1);
    }

    targetDate = new Date(dateArg);
    if (isNaN(targetDate.getTime())) {
      console.error('❌ Error: Invalid date');
      process.exit(1);
    }
  }

  try {
    console.log('🗞️  Daily News Generator');
    console.log('========================\n');
    
    await generateDailyNews(targetDate);
    
    console.log('\n✅ News generation completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}

// Export for use as module
export default generateDailyNews;
