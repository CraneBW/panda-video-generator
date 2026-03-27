import { test } from '@playwright/test';
import { getAuthFilePath } from '../utils/login-helper';
import path from 'path';
import { mkdirSync, existsSync, unlinkSync, statSync } from 'fs';

/**
 * Login script for WeChat Official Account Platform (微信公众平台 mp.weixin.qq.com)
 * Run this ONCE to login and save your session
 * After login, your session will be saved and reused in other tests
 *
 * Usage: pnpm login:weixin-mp
 *
 * Login page: https://mp.weixin.qq.com/
 *
 * Note: This script waits for heading "新的创作" to appear as login success.
 * Please complete the login process manually in the browser (scan QR code or password login).
 */

// Set timeout to 15 minutes for login tests
test.describe.configure({ timeout: 15 * 60 * 1000 }); // 15 minutes

test('login to weixin mp (公众平台) - run this once to save login state', async ({ page, context }) => {
  test.setTimeout(15 * 60 * 1000);
  page.setDefaultTimeout(10 * 60 * 1000);

  console.log('🌐 Opening WeChat Official Account Platform (微信公众平台)...');
  await page.goto('https://mp.weixin.qq.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 10 * 60 * 1000,
  });

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);

  console.log('');
  console.log('🔐 ============================================');
  console.log('🔐 Please login to 微信公众平台 manually');
  console.log('🔐 (Scan QR code or use account/password)');
  console.log('🔐 Script will wait for heading "新的创作" to appear');
  console.log('🔐 Maximum wait time: 15 minutes');
  console.log('🔐 ============================================');
  console.log('');

  console.log('⏳ Waiting for login success (heading "新的创作")...');

  const newCreationHeading = page.getByRole('heading', { name: '新的创作' });
  try {
    await newCreationHeading.waitFor({ state: 'visible', timeout: 15 * 60 * 1000 });
    console.log('✅ Login successful! Found heading "新的创作".');
  } catch {
    console.log('❌ Timeout: Heading "新的创作" did not appear within 15 minutes.');
    console.log('💡 Run again: pnpm login:weixin-mp');
    throw new Error('Login verification timeout');
  }

  console.log('⏳ Waiting for page to fully load...');
  await page.waitForTimeout(3000);

  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  // Save authentication state to separate file (weixin-mp, not weixin)
  console.log('💾 Saving authentication state...');
  const authFilePath = getAuthFilePath('weixin-mp');
  console.log(`📁 Auth file path: ${authFilePath}`);

  if (existsSync(authFilePath)) {
    console.log(`🗑️  Deleting old auth file: ${authFilePath}`);
    unlinkSync(authFilePath);
  }

  const authDir = path.dirname(authFilePath);
  mkdirSync(authDir, { recursive: true });

  await context.storageState({ path: authFilePath });
  console.log(`✅ Authentication state saved to: ${authFilePath}`);

  if (existsSync(authFilePath)) {
    const fileStats = statSync(authFilePath);
    console.log(`✅ Auth file verified (${fileStats.size} bytes)`);
    console.log('📝 You can reuse this session in other 微信公众平台 tests.');
  }

  await page.getByRole('heading', { name: '新的创作' }).click();
});
