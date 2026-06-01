#!/usr/bin/env node

/**
 * CLI: Zhihu URL → output/spider/output.json (+ DeepSeek script at getTtsInputFile(), title.json, public sync).
 * Usage: tsx packages/spider/zhihu/cli-zhihu-video-prep.ts <zhihu_url>
 */

import { ZhihuSpider } from './zhihu-question-spider';
import { generateVideoScript, loadCaptionLlmEnvFromDotenv } from '@panda-video-generator/caption-generator';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { getTtsInputFile } from '@panda-video-generator/caption-generator/paths';
import {
  getSpiderOutputDir,
  getSpiderOutputJsonPath,
  getSpiderTitleJsonPath,
  PUBLIC_VIDEO_DIR,
  PUBLIC_TITLE_JSON_FOR_REMOTION,
} from '../paths';

async function main() {
  let url = process.argv[2];

  // Validate URL
  if (!url) {
    console.error('❌ 请提供知乎问题链接');
    console.error('用法: tsx packages/spider/zhihu/cli-zhihu-video-prep.ts <zhihu_url>');
    console.error('示例: tsx packages/spider/zhihu/cli-zhihu-video-prep.ts https://www.zhihu.com/question/316150890');
    process.exit(1);
  }

  // Validate Zhihu URL format
  if (!url.match(/^https:\/\/www\.zhihu\.com\/question\//)) {
    console.error('❌ 知乎链接格式无效');
    console.error('正确格式: https://www.zhihu.com/question/<问题 ID>');
    process.exit(1);
  }

  // Strip /answer/... suffix — keep only the question URL
  const answerIdx = url.indexOf('/answer/');
  if (answerIdx > 0) {
    const cleaned = url.slice(0, answerIdx);
    console.log(`🔗 从答案 URL 提取问题链接: ${cleaned}`);
    url = cleaned;
  }

  const spider = new ZhihuSpider();

  try {
    console.log('🕷️  正在启动浏览器…');
    await spider.init();

    console.log(`📝 正在抓取: ${url}`);
    const data = await spider.extractQuestion(url);

    console.log('\n=== 抓取结果摘要 ===');
    console.log(`标题: ${data.title}`);
    console.log(`问题: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`);
    console.log(`回答条数: ${data.answers.length}`);

    // Save crawl JSON (fixed name: output.json)
    const spiderOutDir = getSpiderOutputDir();
    await fs.mkdir(resolve(process.cwd(), spiderOutDir), { recursive: true });
    const outputPath = resolve(process.cwd(), getSpiderOutputJsonPath());
    const onDisk = {
      title: data.title,
      content: data.content,
      answers: data.answers,
    };
    await fs.writeFile(outputPath, JSON.stringify(onDisk, null, 2), 'utf-8');
    console.log(`内容已保存: ${outputPath}`);

    console.log('\n✅ 抓取完成');

    // Load .env into process.env so LLM config can read API keys
    loadCaptionLlmEnvFromDotenv();

    // Validate crawled content
    if (!data.title && !data.content && data.answers.length === 0) {
      console.error('❌ 抓取内容为空：标题、内容和回答均为空');
      console.error('   请检查 URL 是否为有效的知乎问题页面');
      process.exit(1);
    }

    if (!data.title) {
      console.error('❌ 标题为空，无法生成视频');
      process.exit(1);
    }

    // Generate video script
    loadCaptionLlmEnvFromDotenv();
    try {
      const scriptPath = await generateVideoScript(data);
      if (!scriptPath) {
        console.error('❌ 口播稿生成失败：LLM 返回空内容');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 口播稿生成失败');
      console.error(error);
      process.exit(1);
    }

    // Generate title.json under spider output dir
    if (data.title) {
      const titleJsonPath = resolve(process.cwd(), getSpiderTitleJsonPath());
      const publicTitleJsonPath = resolve(process.cwd(), PUBLIC_TITLE_JSON_FOR_REMOTION);
      try {
        await fs.mkdir(resolve(process.cwd(), getSpiderOutputDir()), { recursive: true });
        await fs.writeFile(
          titleJsonPath,
          JSON.stringify({ title: data.title }, null, 2),
          'utf-8'
        );
        console.log(`\n📄 已导出标题 JSON: ${titleJsonPath}`);
        console.log(`   标题: ${data.title}`);

        // Also copy to public/video/ for Remotion Studio access
        await fs.mkdir(resolve(process.cwd(), PUBLIC_VIDEO_DIR), { recursive: true });
        await fs.copyFile(titleJsonPath, publicTitleJsonPath);
        console.log(`📋 标题 JSON 已同步到: ${publicTitleJsonPath}`);
      } catch (error) {
        console.error('⚠️  生成 title.json 失败:', error);
      }
    }

    console.log('\n📁 输出文件:');
    console.log(`  - 口播稿: ${getTtsInputFile()}`);
    console.log(`  - 爬取 JSON: ${getSpiderOutputJsonPath()}`);
    if (data.title) {
      console.log(`  - 标题 JSON: ${getSpiderTitleJsonPath()}`);
    }
    console.log('\n💡 下一步: 执行 pnpm render:video 根据以上内容渲染视频');
    console.log('\n✅ 成功');
  } catch (error) {
    console.error('❌ 出错:', error);
    process.exit(1);
  } finally {
    await spider.close();
  }
}

main();
