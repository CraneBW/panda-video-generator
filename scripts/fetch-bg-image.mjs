/**
 * Downloads a background image from Unsplash based on content keywords.
 *
 * Usage:
 *   node scripts/fetch-bg-image.mjs                     # auto-extract from title.json
 *   node scripts/fetch-bg-image.mjs "<keywords>"         # manual keywords
 *   node scripts/fetch-bg-image.mjs --keyword="<text>"   # --keyword flag
 *
 * Env:
 *   UNSPLASH_ACCESS_KEY — free API key from https://unsplash.com/developers
 *   SPIDER_OUTPUT_DIR    — default output/spider (for title.json auto-detect)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const keywordArg = args.find((a) => a.startsWith("--keyword="));
let keyword = keywordArg
  ? keywordArg.slice("--keyword=".length)
  : args[0]?.replace(/^--/, "") || "";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY?.trim();
const SPIDER_OUTPUT_DIR = process.env.SPIDER_OUTPUT_DIR?.trim() || "output/spider";

// Chinese stop words to filter out
const STOP_WORDS = new Set([
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个",
  "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好",
  "自己", "这", "他", "她", "它", "们", "那", "什么", "怎么", "如何", "为什么",
  "可以", "已经", "因为", "所以", "但是", "如果", "虽然", "而且", "还是", "这个",
  "那个", "哪个", "一些", "这些", "那些", "可能", "应该", "需要", "能", "能够",
  "什么", "怎么", "哪", "吗", "呢", "吧", "啊", "哦", "嗯", "哈",
]);

function extractKeywords(text) {
  if (!text) return "";
  // Remove URLs, special chars, keep Chinese chars and letters
  const cleaned = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[?？！!，,。、.《》【】「」『』（）()\[\]{}""''：:；;…—\-/\\|@#$%^&*+=~`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into words (Chinese: individual meaningful segments, English: space-separated)
  const words = cleaned.split(/\s+/);
  // For Chinese text without spaces, try to extract 2-4 char chunks
  if (words.length <= 2 && cleaned.length > 4) {
    // Chinese text: extract all 2-4 char substrings as candidate keywords
    const candidates = [];
    for (let len = 4; len >= 2; len--) {
      for (let i = 0; i <= cleaned.length - len; i++) {
        const chunk = cleaned.slice(i, i + len);
        // Skip chunks containing stop words
        const hasStop = [...chunk].some((c) => STOP_WORDS.has(c));
        if (!hasStop && chunk.trim().length === len) {
          candidates.push(chunk);
        }
      }
    }
    // Deduplicate and take top candidates
    return [...new Set(candidates)].slice(0, 3).join(" ");
  }

  // For mixed/spaced text: filter stop words and short words
  return words
    .filter((w) => {
      if (w.length < 2) return false;
      if (/^\d+$/.test(w)) return false; // skip pure numbers
      // Skip if entire word is stop words
      const chars = [...w];
      if (chars.length <= 2 && chars.every((c) => STOP_WORDS.has(c))) return false;
      return true;
    })
    .slice(0, 3)
    .join(" ");
}

async function searchUnsplash(query) {
  const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=3`;
  console.log(`  Searching: "${query}"`);
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });
  if (!res.ok) {
    console.error(`  Unsplash API error: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data?.results || [];
}

async function downloadImage(image) {
  const imageUrl = image.urls?.regular || image.urls?.full || image.urls?.raw;
  const author = image.user?.name || "Unknown";
  const description = image.alt_description || image.description || "";

  console.log(`  Photo by ${author}: ${description}`);
  console.log(`  Downloading: ${imageUrl}`);

  const imgRes = await fetch(imageUrl, {
    headers: { "User-Agent": "PandaVideoGenerator/1.0" },
  });
  if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`);

  const buffer = Buffer.from(await imgRes.arrayBuffer());

  // Save to public/video/ for Remotion staticFile() access
  const publicDir = resolve(root, "public", "video");
  mkdirSync(publicDir, { recursive: true });
  const publicPath = resolve(publicDir, "bg.jpg");
  writeFileSync(publicPath, buffer);
  console.log(`  Saved: ${publicPath}`);

  // Copy to output/video/
  const outputDir = resolve(root, "output", "video");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(resolve(outputDir, "bg.jpg"), buffer);

  // Metadata
  writeFileSync(
    resolve(publicDir, "bg-meta.json"),
    JSON.stringify({ author, description, unsplash_url: image.links?.html || "", download_url: imageUrl }, null, 2),
  );
  console.log(`  Attribution: ${author}`);
}

async function main() {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log("UNSPLASH_ACCESS_KEY not set — skipping background image download");
    console.log("Get a free key: https://unsplash.com/developers");
    process.exit(0);
  }

  // Auto-detect keyword from spider output if not provided
  if (!keyword) {
    const titlePath = join(root, SPIDER_OUTPUT_DIR, "title.json");
    if (existsSync(titlePath)) {
      try {
        const titleData = JSON.parse(readFileSync(titlePath, "utf-8"));
        keyword = titleData.title || "";
        console.log(`Auto-detected title: ${keyword}`);
      } catch {
        console.warn("Failed to read title.json");
      }
    }
  }

  if (!keyword.trim()) {
    console.error("No keyword provided and no title.json found");
    process.exit(1);
  }

  // Extract and search with progressively shorter keywords
  const primaryQuery = extractKeywords(keyword);
  const fallbackQuery = extractKeywords(keyword).split(" ").slice(0, 2).join(" ");
  const lastQuery = extractKeywords(keyword).split(" ").slice(0, 1).join(" ");

  const queries = [...new Set([primaryQuery, fallbackQuery, lastQuery].filter(Boolean))];
  console.log(`Keywords: ${queries.join(" | ")}`);

  for (const query of queries) {
    if (!query) continue;
    const results = await searchUnsplash(query);
    if (results.length > 0) {
      await downloadImage(results[0]);
      return;
    }
    console.log("  No results");
  }

  console.warn("No images found for any keyword variation — will use dark fallback background");
}

main().catch((err) => {
  console.error("Failed to fetch background image:", err.message);
  process.exit(1);
});
