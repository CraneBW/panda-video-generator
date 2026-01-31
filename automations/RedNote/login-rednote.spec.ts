import { test } from '@playwright/test';
import { performLogin, getAuthFilePath } from '../utils/login-helper';

/**
 * Login script for RedNote
 * Run this ONCE to login and save your session
 * After login, your session will be saved and reused in other tests
 * 
 * Usage: pnpm test:login:rednote
 * 
 * Note: This script has NO timeout limit - you can take as long as you need to login.
 * The script will pause and wait for you to complete the login process manually.
 */

// Set timeout to 15 minutes for login tests to ensure enough time
test.describe.configure({ timeout: 15 * 60 * 1000 }); // 15 minutes

test('login to rednote - run this once to save login state', async ({ page, context }) => {
  // Set timeout to 15 minutes for this specific test
  test.setTimeout(15 * 60 * 1000);
  
  // Also set page timeout to ensure all operations have enough time
  page.setDefaultTimeout(10 * 60 * 1000);
  
  await performLogin(page, context, {
    platform: 'RedNote',
    loginUrl: 'https://creator.xiaohongshu.com/',
    loginIndicators: [
      // Logged-in indicators for Xiaohongshu Creator Platform
      '[class*="avatar"]',
      '[class*="profile"]',
      '[class*="user-menu"]',
      '[class*="user-info"]',
      '[class*="account"]',
      'text=创作中心',
      'text=内容管理',
      'text=数据中心',
      '[class*="creator"]',
      '[class*="dashboard"]',
    ],
    notLoggedInIndicators: [
      // Indicators that show user is NOT logged in
      'text=登录',
      'text=Login',
      'button:has-text("登录")',
      'button:has-text("Login")',
      'a:has-text("登录")',
      'a:has-text("Login")',
      '[class*="login-btn"]',
      '[class*="login-button"]',
      'text=立即登录',
      'text=注册',
      'text=Sign Up',
      '[class*="login-form"]',
      '[class*="login-container"]',
    ],
    authFilePath: getAuthFilePath('rednote'),
  });
});
