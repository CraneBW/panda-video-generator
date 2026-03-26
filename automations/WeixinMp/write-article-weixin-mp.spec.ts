import { test, expect, type BrowserContext } from '@playwright/test';
import path from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { getAuthFilePath } from '../utils/login-helper';
import { OUTPUT_DIRS } from '../../types/paths';

/**
 * Auto-fill a WeChat Official Account (微信公众号) article.
 * Reads from spider/hn-spider/hn.ts output (output/tts/weixin-mp-article.json).
 * Body supports rich text (HTML): <p>, <strong>, <em>, <br>, etc. 公众号 does not support Markdown.
 *
 * 1. Generate: hn single / hn batch (HN_WEIXIN_ARTICLE_COUNT) / hn digest (pnpm hn:weixin-digest)
 * 2. If weixin-mp-article-articles.json exists, all bodies are merged into one draft; HN sources use title
 *    「{中国时区当天日期} - 一周 HackerNews 热榜」.
 * 3. Run: pnpm exec playwright test automations/WeixinMp/write-article-weixin-mp.spec.ts --project=chromium --headed
 *
 * Cover: PNG saved to output/tts/weixin-mp-cover.png, embedded in body as data-URL img, then chosen via 从正文选择.
 */

const weixinMpAuthPath = getAuthFilePath('weixin-mp');
test.use({
  storageState: existsSync(weixinMpAuthPath) ? weixinMpAuthPath : undefined,
});

const WX_MP_ARTICLE_JSON = path.join(process.cwd(), OUTPUT_DIRS.TTS, 'weixin-mp-article.json');
/** Multi-article output from hn:weixin-mp batch (HN_WEIXIN_ARTICLE_COUNT > 1). */
const WX_MP_ARTICLE_BATCH_JSON = path.join(
  process.cwd(),
  OUTPUT_DIRS.TTS,
  'weixin-mp-article-articles.json',
);
/** Generated cover for this run (~2.35:1, matches common 公众号 cover ratio). */
const WX_MP_COVER_PNG = path.join(process.cwd(), OUTPUT_DIRS.TTS, 'weixin-mp-cover.png');

const COVER_WIDTH = 900;
const COVER_HEIGHT = 383;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render title as white text on black background via a headless page screenshot (no extra deps).
 */
async function generateLocalCoverPng(context: BrowserContext, title: string, outPath: string): Promise<void> {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const genPage = await context.newPage();
  await genPage.setViewportSize({ width: COVER_WIDTH, height: COVER_HEIGHT });
  const bodyHtml = escapeHtml(title.trim() || ' ');
  await genPage.setContent(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        width:${COVER_WIDTH}px; height:${COVER_HEIGHT}px;
        background:#000; color:#fff;
        display:flex; align-items:center; justify-content:center;
        font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 42px; font-weight: 600; text-align: center;
        padding: 40px; line-height: 1.35; word-break: break-word;
      }
    </style></head><body>${bodyHtml}</body></html>`
  );
  await genPage.screenshot({ path: outPath, type: 'png' });
  await genPage.close();
}

/** Prepend cover image so 从正文选择 can pick it (editor shows in-body images). */
function prependCoverDataUrlImg(articleBody: string, pngPath: string): string {
  const b64 = readFileSync(pngPath).toString('base64');
  return `<p><img src="data:image/png;base64,${b64}" alt="" /></p>${articleBody}`;
}

const DEFAULT_TEMPLATE = {
  title: '今日简讯',
  author: '编辑',
  body: `<p>大家好，这是一篇简单的公众号文章模板。</p>
<p>正文内容支持<strong>富文本</strong>，可使用 <em>段落</em>、加粗、斜体等。</p>
<p>以上为示例内容，可根据需要修改。</p>`,
};

type WeixinMpArticleFile = {
  title?: string;
  author?: string;
  body?: string;
  source?: string;
};

/** e.g. 2026年3月24日 - 一周 HackerNews 热榜 (Asia/Shanghai calendar day). */
function formatWeeklyHotRankTitle(): string {
  const datePart = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  return `${datePart} - 一周 HackerNews 热榜`;
}

function isHackerNewsSource(source: unknown): boolean {
  return typeof source === 'string' && source.startsWith('hacker-news');
}

function batchSectionHeading(item: WeixinMpArticleFile, idx: number): string {
  return typeof item.title === 'string' && item.title.trim()
    ? item.title.trim()
    : `节选 ${idx + 1}`;
}

/** Quick TOC at top of merged body (no <a>/<ul>, WeChat-safe). */
function buildMergedBatchTocHtml(items: WeixinMpArticleFile[]): string {
  const lines = items.map((item, idx) => {
    const n = idx + 1;
    const label = escapeHtml(batchSectionHeading(item, idx));
    return `${n}. ${label}`;
  });
  return `<p><strong>本期目录</strong></p><p>${lines.join('<br>')}</p><p><br></p>`;
}

function mergeBatchBodies(items: WeixinMpArticleFile[]): string {
  const toc = buildMergedBatchTocHtml(items);
  const sections = items
    .map((item, idx) => {
      const sectionTitle = batchSectionHeading(item, idx);
      const body = typeof item.body === 'string' ? item.body : '';
      return `<p><strong>${escapeHtml(sectionTitle)}</strong></p>${body}`;
    })
    .join('');
  return `${toc}${sections}`;
}

/**
 * Prefer batch JSON (merge into one body + weekly HN title). Else single JSON; HN uses weekly title.
 */
function loadArticle(): { title: string; author: string; body: string } {
  if (existsSync(WX_MP_ARTICLE_BATCH_JSON)) {
    try {
      const raw = readFileSync(WX_MP_ARTICLE_BATCH_JSON, 'utf-8');
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && arr.length > 0) {
        const items = arr as WeixinMpArticleFile[];
        const author =
          items.map((i) => i.author).find((a) => typeof a === 'string' && a.trim()) ??
          DEFAULT_TEMPLATE.author;
        return {
          title: formatWeeklyHotRankTitle(),
          author,
          body: mergeBatchBodies(items),
        };
      }
    } catch {
      // fall through
    }
  }

  if (!existsSync(WX_MP_ARTICLE_JSON)) {
    return DEFAULT_TEMPLATE;
  }
  try {
    const raw = readFileSync(WX_MP_ARTICLE_JSON, 'utf-8');
    const data = JSON.parse(raw) as WeixinMpArticleFile;
    const author =
      typeof data.author === 'string' ? data.author : DEFAULT_TEMPLATE.author;
    const body = typeof data.body === 'string' ? data.body : DEFAULT_TEMPLATE.body;
    const title = isHackerNewsSource(data.source)
      ? formatWeeklyHotRankTitle()
      : typeof data.title === 'string'
        ? data.title
        : DEFAULT_TEMPLATE.title;
    return { title, author, body };
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

test.describe.configure({ timeout: 12 * 60 * 1000 });

test('write article (merged batch / single JSON / default template)', async ({ page, context }) => {
  page.setDefaultTimeout(30 * 1000);

  const article = loadArticle();
  if (existsSync(WX_MP_ARTICLE_BATCH_JSON)) {
    console.log(
      `Using merged batch from ${WX_MP_ARTICLE_BATCH_JSON}: "${article.title}" by ${article.author}`,
    );
  } else if (existsSync(WX_MP_ARTICLE_JSON)) {
    console.log(`Using article from ${WX_MP_ARTICLE_JSON}: "${article.title}" by ${article.author}`);
  } else {
    console.log(
      'Using default template (run pnpm hn:weixin-mp or pnpm hn:weixin-digest to generate weixin-mp-article.json)',
    );
  }

  await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');

  const page2Promise = page.waitForEvent('popup');
  await page.locator('.new-creation__menu-content').first().click();
  const newTab = await page2Promise;
  await expect(newTab.getByRole('textbox', { name: '请在这里输入标题' })).toBeVisible();

  await newTab.getByRole('textbox', { name: '请在这里输入标题' }).click();
  await newTab.getByRole('textbox', { name: '请在这里输入标题' }).fill(article.title);
  await newTab.getByRole('textbox', { name: '请输入作者' }).click();
  await newTab.getByRole('textbox', { name: '请输入作者' }).fill(article.author);

  await generateLocalCoverPng(context, article.title, WX_MP_COVER_PNG);
  console.log(`Cover PNG written: ${WX_MP_COVER_PNG}`);

  // Body: cover image first (for 从正文选择), then rich text from JSON
  const bodyHtml = prependCoverDataUrlImg(article.body, WX_MP_COVER_PNG);
  const bodyArea = newTab.locator('div').filter({ hasText: /^从这里开始写正文$/ }).nth(5);
  await bodyArea.click();
  await newTab.waitForTimeout(300);
  await bodyArea.evaluate(
    (el, html) => {
      el.focus();
      el.innerHTML = html;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    bodyHtml
  );

  // Declaration: 未声明 -> checkbox -> 确定 (only if visible)
  const undeclaredLink = newTab.getByText('未声明').first();
  if (await undeclaredLink.isVisible().catch(() => false)) {
    await undeclaredLink.click();
    await newTab.waitForTimeout(500);
    const checkbox = newTab.locator('.weui-desktop-icon-checkbox').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click();
      await newTab.getByRole('button', { name: '确定' }).first().click().catch(() => { });
    }
  }

  await newTab.waitForTimeout(500);
  await newTab.getByText('拖拽或选择封面 默认首图为封面').click();
  await newTab.getByRole('link', { name: '从正文选择' }).click();

  await expect(newTab.getByRole('heading', { name: '选择图片' })).toBeVisible();
  await expect(newTab.getByText('请从正文插入的图片和视频封面中选择封面')).toBeVisible();

  await newTab.locator('li.appmsg_content_img_item').hover();
  await newTab.locator('li.appmsg_content_img_item').click();

  await newTab.getByRole('button', { name: '下一步' }).click();
  await newTab.getByRole('button', { name: '确认' }).click();
  await newTab.waitForTimeout(1000 + Math.random() * 1500);
  await newTab.getByRole('button', { name: '发表' }).click();

  // Wait for 发表 dialog (weui-desktop-dialog with title 发表)
  const publishDialog = newTab.locator('.weui-desktop-dialog').filter({ has: newTab.getByRole('heading', { name: '发表' }) });
  await publishDialog.waitFor({ state: 'visible', timeout: 10000 });

  // 群发通知: click the first switch (label toggles the hidden checkbox)
  // await publishDialog.locator('label.weui-desktop-switch').first().click();
  // await newTab.waitForTimeout(500);
  await publishDialog.locator('.mass-send__td-setting > .publish_container > .weui-desktop-form__controls > .mass-send__timer-wrp > .weui-desktop-switch > .weui-desktop-switch__box').click();
  await publishDialog.getByRole('term').filter({ hasText: '今天 今天' }).click();
  await publishDialog.locator('.weui-desktop-form__dropdown-label > div > .weui-desktop-dropdown__list > li:nth-child(2) > .weui-desktop-dropdown__list-ele-contain').click();
  await publishDialog.getByRole('textbox', { name: '请选择时间' }).click();
  await publishDialog.getByText('10', { exact: true }).nth(2).click();
  await publishDialog.getByRole('heading', { name: '发表' }).click();

  // 发表 button in dialog footer
  await publishDialog.locator('.weui-desktop-dialog__ft').getByRole('button', { name: '发表' }).click();
  await newTab.waitForTimeout(1000);

  // 继续发表 if confirmation appears
  const continueBtn = newTab.getByRole('button', { name: '继续发表' });
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    await newTab.waitForTimeout(1000);
  }

  await newTab.getByRole('heading', { name: '微信验证' }).click();
  await newTab.getByRole('heading', { name: '正在发表' }).click();
  await newTab.getByRole('heading', { name: '已发表，正在返回首页' }).click();

  console.log('Success: Weixin Mp Article');
});
