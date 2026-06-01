/**
 * Fetches the top N Zhihu hot list questions.
 *
 * Usage:
 *   node scripts/fetch-zhihu-hot.mjs [--top=N] [--json]
 *
 * Output modes:
 *   --json    Prints JSON array with full details
 *   (default) Prints only the top URL to stdout
 *   Set TOP=1 to get only the #1 question
 *
 * GitHub Actions usage:
 *   TOP_URL=$(node scripts/fetch-zhihu-hot.mjs)
 *   echo "zhihu_url=$TOP_URL" >> $GITHUB_OUTPUT
 */

const API_URL = "https://www.zhihu.com/api/v3/feed/topstory/hot-list-web";

const args = process.argv.slice(2);
const topN = parseInt(
  args.find((a) => a.startsWith("--top="))?.split("=")[1] || "1",
  10,
);
const asJson = args.includes("--json");

async function main() {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  const res = await fetch(`${API_URL}?limit=${Math.max(topN, 3)}`, {
    headers,
  });

  if (!res.ok) {
    console.error(`Failed to fetch hot list: HTTP ${res.status}`);
    process.exit(1);
  }

  const body = await res.json();
  const items = body?.data || [];

  if (items.length === 0) {
    console.error("No hot list items found");
    process.exit(1);
  }

  const result = items.slice(0, topN).map((item) => ({
    title: item.target?.title_area?.text || "",
    url: item.target?.link?.url || "",
    excerpt: item.target?.excerpt_area?.text || "",
    heat: item.target?.metrics_area?.text || "",
    answer_count: item.feed_specific?.answer_count || 0,
    card_id: item.card_id || "",
  }));

  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    // Default: print top URL to stdout for shell capture
    process.stdout.write(result[0]?.url || "");
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
