import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { OUTPUT_DIRS, TTS_PATHS } from '../types/paths';

interface ZhihuQuestion {
  title: string;
  content: string;
  answers: Array<{
    author: string;
    content: string;
    voteCount: number;
  }>;
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
 * Generate video script from Zhihu question data using DeepSeek
 * @param data - The extracted Zhihu question data
 * @param outputDir - Output directory for the script file (default: OUTPUT_DIRS.TTS)
 * @returns Path to the generated script file
 */
export async function generateVideoScript(
  data: ZhihuQuestion,
  outputDir: string = OUTPUT_DIRS.TTS
): Promise<string | null> {
  // Load API key
  loadApiKey();

  if (!data.title || (!data.content && data.answers.length === 0)) {
    throw new Error('Invalid data: title and content/answers are required');
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not set. Please set it in .env.local file or environment variables.');
  }

  try {
    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    // Prepare content for DeepSeek
    const contentForDeepSeek = JSON.stringify(data, null, 2);
    const userPrompt = `内容进行整理，并且生成一段视频完整的视频台词, 是平台要尽可能贴近原文, 并且要有Intro和ending的话语

以下是爬取的知乎问题内容（JSON格式）：
${contentForDeepSeek}

请根据以上内容，在内容前加入一段开场白, 并且在内容后加入一段结尾语, 并且生成一段完整的视频台词.

生成的这些台词将会直接显示到视频的字幕中，因此不要添加额外的标记和符号(例如书名号或者括号等任何额外符号), 不要添加任何的解释和说明.

并且根据用户聆听和阅读的友好性，将生成的内容进行调整优化以及分段，并让它变得更流畅和自然.

最终生成文稿总字数不超过800个文字. 每个段落不超过50个字, 以保证用户能够流畅地阅读和理解.

`;

    console.log('\n📝 Sending content to DeepSeek for video script generation...');
    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates video scripts based on content from Zhihu questions.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
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
    console.log(`\n✅ Video script generated and saved to: ${scriptPath}`);
    console.log('\n--- Generated Script Preview ---');
    console.log(scriptText.substring(0, 500) + (scriptText.length > 500 ? '...' : ''));

    return scriptPath;
  } catch (error) {
    console.error('\n❌ Error generating video script with DeepSeek:', error);
    if (error instanceof Error && (error.message.includes('API key') || error.message.includes('DEEPSEEK_API_KEY'))) {
      console.error('\n提示: 请在 .env.local 文件中设置 DEEPSEEK_API_KEY');
    }
    throw error;
  }
}

/**
 * Generate video script from JSON file
 * @param jsonFilePath - Path to the JSON file containing Zhihu question data
 * @param outputDir - Output directory for the script file (default: OUTPUT_DIRS.TTS)
 * @returns Path to the generated script file
 */
export async function generateVideoScriptFromFile(
  jsonFilePath: string,
  outputDir: string = OUTPUT_DIRS.TTS
): Promise<string | null> {
  try {
    const fileContent = await fs.readFile(jsonFilePath, 'utf-8');
    const data: ZhihuQuestion = JSON.parse(fileContent);
    return await generateVideoScript(data, outputDir);
  } catch (error) {
    console.error(`\n❌ Error reading JSON file: ${jsonFilePath}`, error);
    throw error;
  }
}
