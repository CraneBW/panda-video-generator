import { readFileSync, existsSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { GenericPageSpider, type CrawledPagePayload } from './generic-url-spider';

/** Contract: spider output is only these two fields. */
export type SpiderJsonOutput = {
  title: string;
  content: string;
};

/**
 * Merge question body + answers into a single content string for JSON export.
 */
export function flattenCrawledToSpiderJson(payload: {
  title: string;
  content: string;
  answers: CrawledPagePayload['answers'];
}): SpiderJsonOutput {
  const { title, content, answers } = payload;
  if (!answers.length) {
    return { title, content };
  }
  const blocks = answers.map((a, i) => {
    const vote = a.voteCount ? `（${a.voteCount} 赞同）` : '';
    return `【回答 ${i + 1}】${a.author}${vote}\n${a.content}`;
  });
  const merged = [content, ...blocks].filter((s) => s && String(s).trim()).join('\n\n');
  return { title, content: merged };
}

/**
 * Read a local UTF-8 text file into `{ title, content }`.
 * If the first non-empty line is an ATX heading (`# ` …), it becomes the title and the rest is body.
 * Otherwise the title is the filename stem and the full file is content.
 */
export function parseTextFileToSpiderJson(filePath: string): SpiderJsonOutput {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }
  const raw = readFileSync(absPath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') {
    i += 1;
  }
  const firstNonEmpty = i < lines.length ? lines[i].trim() : '';
  const stem = basename(absPath, extname(absPath)) || 'untitled';

  if (firstNonEmpty.startsWith('# ')) {
    const title = firstNonEmpty.replace(/^#+\s*/, '').trim();
    const body = lines.slice(i + 1).join('\n').trimEnd();
    const finalContent = body || raw.trim();
    if (!finalContent) {
      throw new Error('Text file has no usable content');
    }
    return { title: title || stem, content: finalContent };
  }

  const finalContent = raw.trimEnd().length > 0 ? raw.trimEnd() : raw;
  if (!finalContent) {
    throw new Error('Text file has no usable content');
  }
  return { title: stem, content: finalContent };
}

/**
 * Fetch any http(s) page via GenericPageSpider and return { title, content } only.
 * Zhihu question URLs use dedicated DOM extraction; other hosts use generic article extraction.
 */
export async function extractPageUrlToSpiderJson(url: string): Promise<SpiderJsonOutput> {
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }
  const spider = new GenericPageSpider();
  try {
    await spider.init();
    const p = await spider.extractPage(trimmed);
    if (!p.content && !p.answers.length) {
      throw new Error('Could not extract main content from page.');
    }
    return flattenCrawledToSpiderJson({
      title: p.title,
      content: p.content,
      answers: p.answers,
    });
  } finally {
    await spider.close();
  }
}
