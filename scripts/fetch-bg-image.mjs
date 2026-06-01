/**
 * Downloads a background image from Unsplash based on content keywords.
 *
 * Usage:
 *   node scripts/fetch-bg-image.mjs "<keywords>"
 *   node scripts/fetch-bg-image.mjs --keyword="<text>" --fallback
 *
 * Env:
 *   UNSPLASH_ACCESS_KEY — free API key from https://unsplash.com/developers
 *   (optional: skips download if not set, uses solid black fallback in video)
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const keywordArg = args.find((a) => a.startsWith("--keyword="));
const keyword = keywordArg
  ? keywordArg.slice("--keyword=".length)
  : args[0]?.replace(/^--/, "") || "";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY?.trim();

async function main() {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log("UNSPLASH_ACCESS_KEY not set — skipping background image download");
    console.log("Get a free key: https://unsplash.com/developers");
    process.exit(0);
  }

  // Extract meaningful keywords from the title (first 5-8 chars per word, 2-3 words max)
  const keywords = keyword
    .replace(/[?？!！,，。.《》【】\(\)]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 3)
    .join(" ");
  if (!keywords) {
    console.error("No valid keywords extracted from title");
    process.exit(1);
  }

  console.log(`Searching Unsplash for: "${keywords}"`);

  const apiUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&orientation=portrait&per_page=1`;
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });

  if (!res.ok) {
    console.error(`Unsplash API error: ${res.status} ${res.statusText}`);

    // Try to parse error body
    try {
      const err = await res.json();
      console.error(JSON.stringify(err, null, 2));
    } catch {}
    process.exit(1);
  }

  const data = await res.json();
  const results = data?.results || [];
  if (!results.length) {
    console.warn(`No images found for "${keywords}"`);
    process.exit(0);
  }

  const image = results[0];
  const imageUrl = image.urls?.regular || image.urls?.full || image.urls?.raw;
  const author = image.user?.name || "Unknown";
  const description = image.alt_description || image.description || "";

  console.log(`Photo by ${author}: ${description}`);
  console.log(`Downloading: ${imageUrl}`);

  const imgRes = await fetch(imageUrl, {
    headers: { "User-Agent": "PandaVideoGenerator/1.0" },
  });

  if (!imgRes.ok) {
    console.error(`Download failed: ${imgRes.status}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await imgRes.arrayBuffer());

  // Save to public/video/ for Remotion staticFile() access
  const publicDir = resolve(root, "public", "video");
  mkdirSync(publicDir, { recursive: true });
  const publicPath = resolve(publicDir, "bg.jpg");
  writeFileSync(publicPath, buffer);
  console.log(`Saved: ${publicPath}`);

  // Also copy to output/video/ for reference
  const outputDir = resolve(root, "output", "video");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "bg.jpg");
  writeFileSync(outputPath, buffer);
  console.log(`Saved: ${outputPath}`);

  // Write a metadata file for attribution
  const metaPath = resolve(publicDir, "bg-meta.json");
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        keywords,
        author,
        description,
        unsplash_url: image.links?.html || "",
        download_url: imageUrl,
      },
      null,
      2,
    ),
  );
  console.log(`Metadata saved: ${metaPath}`);
}

main().catch((err) => {
  console.error("Failed to fetch background image:", err.message);
  process.exit(1);
});
