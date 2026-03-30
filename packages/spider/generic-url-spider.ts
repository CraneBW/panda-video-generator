#!/usr/bin/env node

/**
 * Internal browser spider: Zhihu question pages vs generic article hosts.
 * Public `{ title, content }` JSON: `cli-extract-text-file-json` (local text) and `cli-extract-page-url-json` (http(s) pages).
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import { promises as fs } from 'fs';
import { getSpiderOutputDir } from './paths';

puppeteer.use(StealthPlugin());

const MAX_TITLE_LEN = 400;
const MAX_CONTENT_LEN = 50_000;

/** Same shape as caption-generator input / ZhihuSpider extract result. */
export type CrawledPagePayload = {
  title: string;
  content: string;
  answers: Array<{ author: string; content: string; voteCount: number }>;
  sourceUrl: string;
};

function isZhihuQuestionUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith('zhihu.com') && u.pathname.includes('/question/');
  } catch {
    return false;
  }
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  return puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });
}

async function applyCommonPageSetup(page: Page): Promise<void> {
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
  });
}

async function gotoAndSettle(page: Page, url: string): Promise<void> {
  const randomDelay = Math.random() * 2000 + 1000;
  await new Promise((r) => setTimeout(r, randomDelay));

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));

  await page.evaluate(async () => {
    const scrollStep = 200;
    const scrollDelay = 100;
    for (let i = 0; i < window.innerHeight; i += scrollStep) {
      window.scrollTo(0, i);
      await new Promise((res) => setTimeout(res, scrollDelay));
    }
  });

  await new Promise((r) => setTimeout(r, 1500));

  try {
    await page.waitForSelector('body', { timeout: 5000 });
  } catch {
    console.warn('Page may not have loaded fully');
  }
}

/** Optional debug artifacts (large); set SPIDER_SAVE_DEBUG=1 to enable. */
async function maybeSaveDebug(page: Page): Promise<void> {
  if (process.env.SPIDER_SAVE_DEBUG !== '1') return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const debugDir = getSpiderOutputDir();
  await fs.mkdir(debugDir, { recursive: true });
  await page.screenshot({
    path: `${debugDir}/generic-debug-${timestamp}.png`,
    fullPage: true,
  });
  const html = await page.content();
  await fs.writeFile(`${debugDir}/generic-debug-${timestamp}.html`, html, 'utf-8');
  console.log(`Debug: ${debugDir}/generic-debug-${timestamp}.png`);
}

async function extractZhihuPayload(page: Page): Promise<Omit<CrawledPagePayload, 'sourceUrl'>> {
  const title = await page.evaluate(() => {
    const selectors = [
      'h1.QuestionHeader-title',
      'h1[itemprop="name"]',
      '[data-za-detail-view-element_name="Question"] h1',
      '.QuestionHeader-title',
      'h1',
      '.QuestionHeader h1',
      '[class*="QuestionHeader"] h1',
      'main h1',
      'article h1',
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim();
      if (text && text.length > 3) return text;
    }
    return '';
  });

  const content = await page.evaluate(() => {
    const selectors = [
      '.QuestionRichText',
      '.QuestionHeader-detail .RichText',
      '[data-za-detail-view-element_name="Question"] .RichText',
      '.QuestionHeader-detail .RichContent',
      '.QuestionHeader-detail',
      '[class*="QuestionRichText"]',
      '[class*="RichText"]',
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.textContent?.trim() || '';
      if (text.length > 10) return text;
    }
    return '';
  });

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  await new Promise((r) => setTimeout(r, 1500));

  const answers = await page.evaluate(() => {
    type Ans = { author: string; content: string; voteCount: number };
    const answerContainerSelectors = [
      '.List-item',
      '.AnswerItem',
      '[data-za-detail-view-element_name="AnswerItem"]',
      '[class*="AnswerItem"]',
      '[class*="ContentItem"]',
      'article[class*="Answer"]',
    ];

    let answerElements: Element[] = [];
    for (const selector of answerContainerSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        answerElements = elements;
        break;
      }
    }

    if (answerElements.length === 0) {
      const allArticles = Array.from(document.querySelectorAll('article, [class*="Item"]'));
      answerElements = allArticles.filter((el) => (el.textContent || '').length > 100);
    }

    const results: Ans[] = [];

    answerElements.forEach((element, index) => {
      try {
        const authorSelectors = [
          '.AuthorInfo-name',
          '.UserLink-link',
          '[itemprop="author"]',
          '[class*="AuthorInfo"] [class*="name"]',
          '[class*="UserLink"]',
          'a[class*="User"]',
          '.ContentItem-meta a',
        ];
        let author = '';
        for (const selector of authorSelectors) {
          const authorEl = element.querySelector(selector);
          author = authorEl?.textContent?.trim() || '';
          if (author) break;
        }

        const contentSelectors = [
          '.RichContent-inner',
          '.RichText',
          '.AnswerItem-content',
          '[class*="RichContent"]',
          '[class*="RichText"]',
          '.ContentItem-richText',
          'div[class*="content"]',
        ];
        let answerContent = '';
        for (const selector of contentSelectors) {
          const contentEl = element.querySelector(selector);
          answerContent = contentEl?.textContent?.trim() || '';
          if (answerContent.length > 50) break;
        }

        if (!answerContent && element.textContent) {
          answerContent = element.textContent.trim();
        }

        const voteSelectors = [
          '.VoteButton--up',
          '[aria-label*="赞同"]',
          '.AnswerItem-actions button',
          '[class*="VoteButton"]',
          'button[class*="Vote"]',
        ];
        let voteCount = 0;
        for (const selector of voteSelectors) {
          const voteEl = element.querySelector(selector);
          if (voteEl) {
            const voteText =
              voteEl.textContent?.trim() || voteEl.getAttribute('aria-label') || '';
            const match = voteText.match(/(\d+)/);
            if (match) {
              voteCount = parseInt(match[1], 10);
              break;
            }
          }
        }

        if (answerContent && answerContent.length > 20) {
          results.push({
            author: author || `User ${index + 1}`,
            content: answerContent,
            voteCount,
          });
        }
      } catch {
        /* skip */
      }
    });

    return results;
  });

  return {
    title: title.slice(0, MAX_TITLE_LEN),
    content: content.slice(0, MAX_CONTENT_LEN),
    answers,
  };
}

/** Non-Zhihu: main article / readability-style body. */
async function extractGenericArticlePayload(
  page: Page,
): Promise<Omit<CrawledPagePayload, 'sourceUrl'>> {
  const raw = await page.evaluate(() => {
    const selectors = [
      'article .post-content',
      'article .articlebody',
      'article .content',
      '.post-content',
      '.article-body',
      '.article-content',
      'article .entry-content',
      '[itemprop="articleBody"]',
      '.post__content',
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
      if (text.length > 100 && text.length > body.length) body = text;
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
    let title = document.querySelector('h1')?.textContent?.trim() || '';
    if (!title) {
      const og = document.querySelector('meta[property="og:title"]');
      title = og?.getAttribute('content')?.trim() || '';
    }
    if (!title) {
      title = document.querySelector('title')?.textContent?.trim() || '';
    }
    return { title, body };
  });

  return {
    title: raw.title.slice(0, MAX_TITLE_LEN),
    content: raw.body.slice(0, MAX_CONTENT_LEN),
    answers: [],
  };
}

/**
 * Generic spider: same lifecycle as ZhihuSpider (init → extract → close).
 * extractPage(url) opens one tab per call; use one instance per batch.
 */
export class GenericPageSpider {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await launchBrowser();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Fetch URL and return { title, content, answers, sourceUrl }.
   * Zhihu question URLs use Zhihu DOM logic; other hosts use generic article extraction.
   */
  async extractPage(url: string): Promise<CrawledPagePayload> {
    if (!this.browser) await this.init();

    const page = await this.browser!.newPage();
    try {
      await applyCommonPageSetup(page);
      await gotoAndSettle(page, url);
      await maybeSaveDebug(page);

      const base = isZhihuQuestionUrl(url)
        ? await extractZhihuPayload(page)
        : await extractGenericArticlePayload(page);

      return {
        ...base,
        sourceUrl: url,
      };
    } finally {
      await page.close();
    }
  }

  async saveToFile(payload: CrawledPagePayload, outputPath: string): Promise<void> {
    const { sourceUrl, ...rest } = payload;
    const serializable = { ...rest, sourceUrl };
    await fs.writeFile(outputPath, JSON.stringify(serializable, null, 2), 'utf-8');
    console.log(`Content saved to: ${outputPath}`);
  }
}

/** Strip sourceUrl for APIs that only need the Zhihu-shaped fields. */
export function toCaptionGeneratorInput(payload: CrawledPagePayload): {
  title: string;
  content: string;
  answers: Array<{ author: string; content: string; voteCount: number }>;
} {
  const { title, content, answers } = payload;
  return { title, content, answers };
}

export default GenericPageSpider;
