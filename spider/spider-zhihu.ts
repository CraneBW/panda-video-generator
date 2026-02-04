#!/usr/bin/env node

/**
 * Zhihu Spider Runner
 * Extracts content from Zhihu question and generates video script
 * Usage: tsx spider/spider-zhihu.ts <zhihu_url>
 */

import { ZhihuSpider } from './spider';
import { generateVideoScript } from './caption-generator';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { OUTPUT_DIRS, TTS_PATHS, VIDEO_PATHS, SPIDER_PATHS, PUBLIC_DIRS } from '../types/paths';

async function main() {
  const url = process.argv[2];

  // Validate URL
  if (!url) {
    console.error('❌ Error: Please provide a Zhihu question URL');
    console.error('Usage: tsx spider/spider-zhihu.ts <zhihu_url>');
    console.error('Example: tsx spider/spider-zhihu.ts https://www.zhihu.com/question/316150890');
    process.exit(1);
  }

  // Validate Zhihu URL format
  if (!url.match(/^https:\/\/www\.zhihu\.com\/question\//)) {
    console.error('❌ Error: Invalid Zhihu URL format');
    console.error('Expected format: https://www.zhihu.com/question/<question_id>');
    process.exit(1);
  }

  const spider = new ZhihuSpider();

  try {
    console.log('🕷️  Initializing browser...');
    await spider.init();

    console.log(`📝 Extracting content from: ${url}`);
    const data = await spider.extractQuestion(url);

    console.log('\n=== Extracted Content ===');
    console.log(`Title: ${data.title}`);
    console.log(`Question: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`);
    console.log(`Answers found: ${data.answers.length}`);

    // Save to JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    await fs.mkdir(SPIDER_PATHS.OUTPUT_DIR, { recursive: true });
    const outputPath = `${SPIDER_PATHS.OUTPUT_DIR}/output-${timestamp}.json`;
    await spider.saveToFile(data, outputPath);

    console.log('\n✅ Extraction completed successfully!');

    // Generate video script
    if (data.title && (data.content || data.answers.length > 0)) {
      try {
        await generateVideoScript(data, OUTPUT_DIRS.TTS);
      } catch (error) {
        console.error('⚠️  Failed to generate video script, but extraction was successful');
        console.error(error);
      }
    }

    // Generate title.json
    if (data.title) {
      const titleJsonPath = resolve(process.cwd(), VIDEO_PATHS.TITLE_JSON);
      const publicTitleJsonPath = resolve(process.cwd(), VIDEO_PATHS.PUBLIC_TITLE_JSON);
      try {
        await fs.mkdir(resolve(process.cwd(), OUTPUT_DIRS.VIDEO), { recursive: true });
        await fs.writeFile(
          titleJsonPath,
          JSON.stringify({ title: data.title }, null, 2),
          'utf-8'
        );
        console.log(`\n📄 Title JSON exported: ${titleJsonPath}`);
        console.log(`   Title: ${data.title}`);
        
        // Also copy to public/video/ for Remotion Studio access
        await fs.mkdir(resolve(process.cwd(), PUBLIC_DIRS.VIDEO), { recursive: true });
        await fs.copyFile(titleJsonPath, publicTitleJsonPath);
        console.log(`📋 Title JSON also copied to: ${publicTitleJsonPath}`);
      } catch (error) {
        console.error('⚠️  Failed to generate title.json:', error);
      }
    }

    console.log('\n📁 Output files:');
    console.log(`  - Caption: ${TTS_PATHS.INPUT}`);
    console.log(`  - Raw data: ${outputPath}`);
    if (data.title) {
      console.log(`  - Title JSON: ${VIDEO_PATHS.TITLE_JSON}`);
    }
    console.log('\n💡 Next step: Run \'pnpm render:video\' to generate video from the extracted content');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await spider.close();
  }
}

main();
