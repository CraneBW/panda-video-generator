import { test } from '@playwright/test';
import path from 'path';
import { existsSync } from 'fs';
import { getAuthFilePath } from '../utils/login-helper';
import { UPLOAD_PATHS } from '../../types/paths';
import { UPLOAD_PATHS } from '../../types/paths';

/**
 * Auto upload video to RedNote
 * Uses Playwright's default setup with saved login state
 * Automatically reads video and title from configured paths (see types/paths.ts)
 * 
 * Usage: 
 *   pnpm test:upload:rednote
 * 
 * Or override with environment variables:
 *   VIDEO_PATH=out/custom.mp4 VIDEO_TITLE="Custom Title" pnpm test:upload:rednote
 */

interface UploadConfig {
  videoPath: string;
  title: string;
  description?: string;
  tags?: string[];
  coverPath?: string;
}

// Get video file path (default to fixed filename)
function getVideoPath(): string {
  const defaultVideoPath = path.join(process.cwd(), UPLOAD_PATHS.DEFAULT_VIDEO);
  return process.env.VIDEO_PATH || defaultVideoPath;
}

// Get title from JSON file or environment
function getTitleFromJson(): string | null {
  const titleJsonPath = path.join(process.cwd(), UPLOAD_PATHS.DEFAULT_TITLE_JSON);
  
  if (!existsSync(titleJsonPath)) {
    return null;
  }
  
  try {
    const fs = require('fs');
    const titleData = JSON.parse(fs.readFileSync(titleJsonPath, 'utf-8'));
    return titleData.title || null;
  } catch (e) {
    return null;
  }
}

// Get upload configuration from environment or defaults
function getUploadConfig(): UploadConfig {
  const videoPath = getVideoPath();
  
  if (!videoPath || !existsSync(videoPath)) {
    throw new Error(
      `Video file not found: ${videoPath}\n` +
      `Please ensure ${UPLOAD_PATHS.DEFAULT_VIDEO} exists or set VIDEO_PATH environment variable.`
    );
  }
  
  // Try to get title from JSON file first, then environment variable
  let title = process.env.VIDEO_TITLE || getTitleFromJson();
  
  if (!title) {
    throw new Error(
      'VIDEO_TITLE is required. Please set it:\n' +
      '  export VIDEO_TITLE="Your Video Title"\n' +
      `Or ensure ${UPLOAD_PATHS.DEFAULT_TITLE_JSON} exists with a title field.`
    );
  }
  
  const config: UploadConfig = {
    videoPath: path.resolve(videoPath),
    title,
    description: process.env.VIDEO_DESC || '',
    tags: process.env.VIDEO_TAGS ? process.env.VIDEO_TAGS.split(',').map(t => t.trim()) : [],
    coverPath: process.env.VIDEO_COVER ? path.resolve(process.env.VIDEO_COVER) : undefined,
  };
  
  return config;
}

// Load saved authentication state for RedNote if it exists
const rednoteAuthFile = getAuthFilePath('rednote');
if (existsSync(rednoteAuthFile)) {
  test.use({ storageState: rednoteAuthFile });
  console.log('Auth: RedNote');
} else {
  console.log('Auth: RedNote (not found, run: pnpm test:login:rednote)');
}

// Configure test suite: 5 minute timeout
test.describe.configure({ timeout: 5 * 60 * 1000 });

test('upload video to rednote', async ({ page }) => {
  // Set timeout for this specific test (5 minutes)
  test.setTimeout(5 * 60 * 1000);
  
  const config = getUploadConfig();
  
  console.log(`Upload: RedNote - ${config.title}`);
  
  // Step 1: Navigate to RedNote (Xiaohongshu Creator Platform) upload page
  await page.goto('https://creator.xiaohongshu.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  // Check if logged in
  const loginRequired = await page.locator('text=登录').first().isVisible().catch(() => false) ||
                        await page.locator('text=Login').first().isVisible().catch(() => false) ||
                        await page.locator('button:has-text("登录")').first().isVisible().catch(() => false);
  if (loginRequired) {
    throw new Error(
      'Not logged in! Please run login script first:\n' +
      '  pnpm test:login:rednote'
    );
  }
  
  console.log('✅ Logged in successfully (using saved session)');
  
  // Step 2: Navigate to content management or upload page
  console.log('🔍 Looking for content management or upload option...');
  await page.waitForTimeout(2000);
  
  // Try to find and click "发布笔记" or "内容管理" or upload button
  const uploadPageSelectors = [
    'text=发布',
    'text=内容管理',
    'text=上传视频',
    'button:has-text("发布")',
    'button:has-text("发布笔记")',
    'a:has-text("发布笔记")',
    'a:has-text("内容管理")',
    '[class*="publish"]',
    '[class*="upload"]',
    '[class*="content-manage"]',
  ];
  
  let uploadPageNavigated = false;
  for (const selector of uploadPageSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 })) {
        await element.click();
        console.log(`✅ Clicked upload/content option: ${selector}`);
        uploadPageNavigated = true;
        await page.waitForTimeout(3000);
        break;
      }
    } catch (e) {
      // Continue
    }
  }
  
  // If no button found, try navigating directly to upload URL
  if (!uploadPageNavigated) {
    console.log('💡 Trying to navigate directly to upload page...');
    try {
      await page.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      console.log('✅ Navigated to publish page');
    } catch (e) {
      console.log('⚠️  Could not navigate to upload page directly, continuing with current page...');
    }
  }
  
  await page.waitForTimeout(2000);
  
  // Step 3: Find the file input element for video upload
  console.log('📤 Looking for upload file input...');
  
  const fileInputSelectors = [
    'input[type="file"]',
    'input[type="file"][accept*="video"]',
    '.upload-area input[type="file"]',
    '[class*="upload"] input[type="file"]',
    'input[accept*="video"]',
  ];
  
  let uploadInput = null;
  for (const selector of fileInputSelectors) {
    try {
      const input = page.locator(selector).first();
      const count = await input.count();
      if (count > 0) {
        const tagName = await input.evaluate((el: any) => el?.tagName?.toLowerCase());
        if (tagName === 'input') {
          uploadInput = input;
          console.log(`✅ Found file input: ${selector}`);
          break;
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!uploadInput) {
    console.log('⚠️  File input not found. Trying to click upload area...');
    const uploadAreaSelectors = [
      '.upload-area',
      '[class*="upload"]',
      '[class*="drop"]',
      '[class*="video-upload"]',
    ];
    
    for (const selector of uploadAreaSelectors) {
      try {
        const area = page.locator(selector).first();
        if (await area.isVisible({ timeout: 3000 })) {
          const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 5000 }),
            area.click(),
          ]);
          await fileChooser.setFiles(config.videoPath);
          console.log(`✅ Video file selected via file chooser: ${selector}`);
          await page.waitForTimeout(3000);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
  } else {
    // Step 4: Upload video file
    console.log(`📁 Uploading video: ${config.videoPath}`);
    try {
      await uploadInput.setInputFiles(config.videoPath);
      console.log('✅ Video file selected');
      await page.waitForTimeout(3000);
    } catch (error: any) {
      console.log(`❌ Error uploading file: ${error.message}`);
      console.log('💡 Trying alternative method: using file chooser...');
      
      const uploadArea = page.locator('.upload-area').first();
      if (await uploadArea.isVisible({ timeout: 3000 })) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }),
          uploadArea.click(),
        ]);
        await fileChooser.setFiles(config.videoPath);
        console.log('✅ Video file selected via file chooser');
        await page.waitForTimeout(3000);
      } else {
        throw new Error('Could not find upload area or file input');
      }
    }
  }
  
  // Step 5: Wait for video to process/upload
  console.log('⏳ Waiting for video to finish uploading/processing...');
  await page.waitForTimeout(5000);
  
  // Step 6: Fill in video information
  console.log('✏️  Filling in video information...');
  await page.waitForTimeout(2000);
  
  // Fill title/caption (Xiaohongshu uses "标题" for title)
  // RedNote/Xiaohongshu has a 20 character limit for titles
  const maxTitleLength = 20;
  const truncatedTitle = config.title.length > maxTitleLength 
    ? config.title.substring(0, maxTitleLength) 
    : config.title;
  
  if (config.title.length > maxTitleLength) {
    console.log(`⚠️  Title truncated from ${config.title.length} to ${maxTitleLength} characters (RedNote limit)`);
    console.log(`   Original: ${config.title}`);
    console.log(`   Truncated: ${truncatedTitle}`);
  }
  
  const titleSelectors = [
    'input[placeholder*="标题"]',
    'input[placeholder*="笔记标题"]',
    'input[placeholder*="title"]',
    'input[placeholder*="caption"]',
    'textarea[placeholder*="标题"]',
    'textarea[placeholder*="笔记标题"]',
    'textarea[placeholder*="title"]',
    'textarea[placeholder*="caption"]',
    'input[name="title"]',
    'input[name="caption"]',
    '[class*="title"] input',
    '[class*="caption"] input',
    '[class*="title"] textarea',
    '[class*="caption"] textarea',
  ];
  
  let titleFilled = false;
  for (const selector of titleSelectors) {
    try {
      const titleInput = page.locator(selector).first();
      const count = await titleInput.count();
      if (count > 0) {
        const visible = await titleInput.isVisible({ timeout: 2000 });
        if (visible) {
          await titleInput.click({ timeout: 1000 });
          await titleInput.fill(truncatedTitle);
          console.log(`✅ Title filled using selector: ${selector}`);
          titleFilled = true;
          await page.waitForTimeout(500);
          break;
        }
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!titleFilled) {
    console.log('⚠️  Title input not found automatically. Please fill manually.');
  }
  
  // Fill description if provided (Xiaohongshu uses "描述" or "笔记描述")
  if (config.description) {
    const descSelectors = [
      'textarea[placeholder*="描述"]',
      'textarea[placeholder*="笔记描述"]',
      'textarea[placeholder*="description"]',
      'textarea[placeholder*="简介"]',
      'textarea[name="desc"]',
      'textarea[name="description"]',
      '[class*="desc"] textarea',
      '[class*="description"] textarea',
    ];
    
    let descFilled = false;
    for (const selector of descSelectors) {
      try {
        const descInput = page.locator(selector).first();
        const count = await descInput.count();
        if (count > 0) {
          const visible = await descInput.isVisible({ timeout: 2000 });
          if (visible) {
            await descInput.click({ timeout: 1000 });
            await descInput.fill(config.description);
            console.log(`✅ Description filled using selector: ${selector}`);
            descFilled = true;
            await page.waitForTimeout(500);
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!descFilled) {
      console.log('⚠️  Description input not found automatically. Please fill manually.');
    }
  }
  
  // Fill tags if provided (Xiaohongshu supports hashtags/topics)
  if (config.tags && config.tags.length > 0) {
    const tagSelectors = [
      'input[placeholder*="标签"]',
      'input[placeholder*="话题"]',
      'input[placeholder*="tag"]',
      'input[placeholder*="hashtag"]',
      'input[placeholder*="#"]',
      '.tag-input input',
      '[class*="tag"] input',
      '[class*="hashtag"] input',
      '[class*="topic"] input',
      'input[type="text"][placeholder*="标签"]',
      'input[type="text"][placeholder*="话题"]',
    ];
    
    let tagsFilled = false;
    for (const selector of tagSelectors) {
      try {
        const tagInput = page.locator(selector).first();
        const count = await tagInput.count();
        if (count > 0) {
          const visible = await tagInput.isVisible({ timeout: 2000 });
          if (visible) {
            await tagInput.click({ timeout: 1000 });
            // Format tags with # prefix if not already present
            const formattedTags = config.tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            await tagInput.fill(formattedTags);
            console.log(`✅ Tags filled using selector: ${selector}`);
            tagsFilled = true;
            await page.waitForTimeout(500);
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!tagsFilled) {
      console.log('⚠️  Tags input not found automatically. Please fill manually.');
    }
  }
  
  // Step 7: Wait for video processing to complete
  console.log('⏳ Waiting for video processing to complete...');
  await page.waitForTimeout(10000);
  
  // Step 8: Click publish button
  console.log('');
  console.log('📝 Video upload/form filling completed!');
  console.log('🚀 Looking for publish button...');
  await page.waitForTimeout(2000);
  
  // Scroll to bottom to ensure publish button is visible
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  
  // Try to find publish button
  let publishClicked = false;
  
  const publishSelectors = [
    'button:has-text("发布")',
    'button:has-text("发布笔记")',
    'button:has-text("确认发布")',
    'button:has-text("Publish")',
    '[class*="publish-button"]',
    '[class*="submit-button"]',
    '[class*="PublishButton"]',
    'button[type="submit"]',
    '[data-testid*="publish"]',
  ];
  
  for (const selector of publishSelectors) {
    try {
      const publishButton = page.locator(selector).first();
      const visible = await publishButton.isVisible({ timeout: 3000 });
      if (visible) {
        const isEnabled = await publishButton.isEnabled().catch(() => false);
        if (isEnabled) {
          console.log(`✅ Found publish button: ${selector}`);
          await publishButton.click();
          console.log('✅ Publish button clicked!');
          publishClicked = true;
          await page.waitForTimeout(2000);
          break;
        } else {
          console.log(`⚠️  Publish button found but disabled: ${selector}`);
        }
      }
    } catch (e) {
      // Continue checking other selectors
    }
  }
  
  if (!publishClicked) {
    console.log('⚠️  Publish button not found automatically.');
    console.log('💡 Pausing for manual review - please click publish button manually');
    await page.pause();
  } else {
    // Wait for publication to complete
    console.log('⏳ Waiting for publication to complete...');
    await page.waitForTimeout(5000);
    
    // Check for success indicators
    let publicationSuccess = false;
    
    const successSelectors = [
      'text=发布成功',
      'text=Published',
      'text=上传成功',
      'text=Upload successful',
      '[class*="success"]',
      '[class*="Success"]',
    ];
    
    for (const selector of successSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 10000 })) {
          publicationSuccess = true;
          console.log(`✅ Publication successful! Found: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!publicationSuccess) {
      console.log('Success: RedNote (check manually)');
    } else {
      console.log('Success: RedNote');
    }
  }
});
