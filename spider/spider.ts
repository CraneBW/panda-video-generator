import puppeteer from 'puppeteer-extra';

import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser } from 'puppeteer';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

interface ZhihuQuestion {
  title: string;
  content: string;
  answers: ZhihuAnswer[];
}

interface ZhihuAnswer {
  author: string;
  content: string;
  voteCount: number;
}

/**
 * Spider tool to extract main content from Zhihu question pages
 */
export class ZhihuSpider {
  private browser: Browser | null = null;

  /**
   * Initialize the browser with stealth plugin
   */
  async init(): Promise<void> {
    // Use executable path from environment if available (for GitHub Actions)
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    this.browser = await puppeteer.launch({
      headless: true, // Use headless mode with stealth plugin
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

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Extract main content from a Zhihu question page
   * @param url - The Zhihu question URL
   * @returns Extracted question data
   */
  async extractQuestion(url: string): Promise<ZhihuQuestion> {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser!.newPage();
    
    try {
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Set additional headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      });

      console.log(`Fetching: ${url}`);
      
      // Add random delay before navigation to simulate human behavior
      const randomDelay = Math.random() * 2000 + 1000; // 1-3 seconds
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Wait for page to fully load with random delays
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      
      // Simulate human-like scrolling behavior
      await page.evaluate(async () => {
        const scrollStep = 200;
        const scrollDelay = 100;
        for (let i = 0; i < window.innerHeight; i += scrollStep) {
          window.scrollTo(0, i);
          await new Promise(resolve => setTimeout(resolve, scrollDelay));
        }
      });
      
      // Wait a bit more for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to wait for any content to appear
      try {
        await page.waitForSelector('body', { timeout: 5000 });
      } catch (e) {
        console.warn('Page may not have loaded properly');
      }

      // Debug: Save screenshot and HTML for inspection
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      await page.screenshot({ path: `spider/debug-${timestamp}.png`, fullPage: true });
      const html = await page.content();
      const fs = await import('fs/promises');
      await fs.writeFile(`spider/debug-${timestamp}.html`, html, 'utf-8');
      console.log(`Debug files saved: debug-${timestamp}.png, debug-${timestamp}.html`);

      // Extract question title - try more selectors
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
          if (element && element.textContent?.trim()) {
            const text = element.textContent.trim();
            // Filter out empty or very short titles
            if (text.length > 3) {
              return text;
            }
          }
        }
        return '';
      });

      // Extract question content/description
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
          if (element) {
            const text = element.textContent?.trim() || '';
            if (text.length > 10) {
              return text;
            }
          }
        }
        return '';
      });

      // Scroll to load more content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract answers - try more selectors
      const answers = await page.evaluate(() => {
        // Try multiple selectors to find answer containers
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

        // If no specific containers found, try to find by content structure
        if (answerElements.length === 0) {
          const allArticles = Array.from(document.querySelectorAll('article, [class*="Item"]'));
          answerElements = allArticles.filter(el => {
            const text = el.textContent || '';
            return text.length > 100; // Likely an answer if it has substantial content
          });
        }

        const results: ZhihuAnswer[] = [];

        answerElements.forEach((element, index) => {
          try {
            // Extract author name - try more selectors
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
              if (authorEl) {
                author = authorEl.textContent?.trim() || '';
                if (author) break;
              }
            }

            // Extract answer content - try more selectors
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
              if (contentEl) {
                answerContent = contentEl.textContent?.trim() || '';
                if (answerContent.length > 50) break; // Prefer longer content
              }
            }

            // If no content found with selectors, try getting text from the element itself
            if (!answerContent && element.textContent) {
              answerContent = element.textContent.trim();
            }

            // Extract vote count
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
                const voteText = voteEl.textContent?.trim() || voteEl.getAttribute('aria-label') || '';
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
          } catch (error) {
            // Silently skip errors
          }
        });

        return results;
      });

      return {
        title,
        content,
        answers,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Save extracted content to a file
   * @param data - The extracted question data
   * @param outputPath - Output file path
   */
  async saveToFile(data: ZhihuQuestion, outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(`Content saved to: ${outputPath}`);
  }

  /**
   * Save extracted content as markdown
   * @param data - The extracted question data
   * @param outputPath - Output file path
   */
  async saveToMarkdown(data: ZhihuQuestion, outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    
    let markdown = `# ${data.title}\n\n`;
    
    if (data.content) {
      markdown += `## Question\n\n${data.content}\n\n`;
    }
    
    markdown += `## Answers\n\n`;
    
    data.answers.forEach((answer, index) => {
      markdown += `### Answer ${index + 1} (by ${answer.author})`;
      if (answer.voteCount > 0) {
        markdown += ` - ${answer.voteCount} votes`;
      }
      markdown += `\n\n${answer.content}\n\n---\n\n`;
    });
    
    await fs.writeFile(outputPath, markdown, 'utf-8');
    console.log(`Markdown saved to: ${outputPath}`);
  }
}

// Export for use as module
export default ZhihuSpider;
