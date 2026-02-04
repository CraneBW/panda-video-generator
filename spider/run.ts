#!/usr/bin/env node

/**
 * Simple runner script for the spider
 * Usage: node spider/run.ts <url> [format]
 */

import { ZhihuSpider } from './spider';
import { generateVideoScript } from './caption-generator';
import { OUTPUT_DIRS, SPIDER_PATHS } from '../types/paths';

async function main() {
  const url = process.argv[2] || 'https://www.zhihu.com/question/1999774552750778199';
  const outputFormat = (process.argv[3] || 'json') as 'json' | 'markdown';
  
  if (!url.startsWith('http')) {
    console.error('Please provide a valid URL');
    process.exit(1);
  }
  
  const spider = new ZhihuSpider();
  
  try {
    console.log('Initializing browser...');
    await spider.init();
    
    console.log(`Extracting content from: ${url}`);
    const data = await spider.extractQuestion(url);
    
    console.log('\n=== Extracted Content ===');
    console.log(`Title: ${data.title}`);
    console.log(`Question: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`);
    console.log(`Answers found: ${data.answers.length}`);
    
    // Save to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fs = await import('fs/promises');
    await fs.mkdir(SPIDER_PATHS.OUTPUT_DIR, { recursive: true });
    const outputPath = outputFormat === 'markdown' 
      ? `${SPIDER_PATHS.OUTPUT_DIR}/output-${timestamp}.md`
      : `${SPIDER_PATHS.OUTPUT_DIR}/output-${timestamp}.json`;
    
    if (outputFormat === 'markdown') {
      await spider.saveToMarkdown(data, outputPath);
    } else {
      await spider.saveToFile(data, outputPath);
    }
    
    console.log('\n✅ Extraction completed successfully!');
    
    // Send to Gemini for video script generation
    if (data.title && (data.content || data.answers.length > 0)) {
      try {
        await generateVideoScript(data, OUTPUT_DIRS.TTS);
      } catch {
        // Don't exit on Gemini error, just log it
        console.error('Failed to generate video script, but extraction was successful');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await spider.close();
  }
}

main();
