/**
 * Fetches the top Zhihu hot question and runs the full pipeline.
 *
 * Usage:
 *   pnpm hot:zhihu:video                 # Top 1, horizontal
 *   pnpm hot:zhihu:video:vertical        # Top 1, vertical
 *   pnpm hot:zhihu:video --vertical      # Top 1, vertical
 *   pnpm hot:zhihu:video --top=3         # Top 3
 *   pnpm hot:zhihu:video --top=1 --publish  # Top 1 + auto publish
 *   pnpm hot:zhihu:video --vertical --publish  # Vertical + publish
 */

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const topN = parseInt(
  args.find((a) => a.startsWith("--top="))?.split("=")[1] || "1",
  10,
);
const doPublish = args.includes("--publish");
const isVertical = args.includes("--vertical");

function run(cmd, subArgs) {
  console.log(`\n> ${cmd} ${subArgs.join(" ")}\n`);
  const r = spawnSync(cmd, subArgs, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`Command failed with exit code ${r.status}`);
    process.exit(r.status);
  }
}

// Step 1: Fetch hot question
console.log("Fetching Zhihu hot list...");
const fetchResult = spawnSync("node", ["scripts/fetch-zhihu-hot.mjs", `--top=${topN}`, "--json"], {
  cwd: root,
  encoding: "utf-8",
  stdio: ["ignore", "pipe", "inherit"],
});

if (fetchResult.status !== 0) {
  console.error("Failed to fetch Zhihu hot list");
  process.exit(fetchResult.status);
}

const questions = JSON.parse(fetchResult.stdout);
if (!questions.length) {
  console.error("No hot questions found");
  process.exit(1);
}

const top = questions[0];
console.log(`\nTop question: ${top.title}`);
console.log(`URL: ${top.url}`);
console.log(`Heat: ${top.heat}\n`);

// Step 2: Run pipeline
run("pnpm", ["spider:zhihu", "--", top.url]);

if (isVertical) {
  // Vertical: TTS -> render Video-Vertical
  run("pnpm", ["tts"]);
  run("pnpm", ["render:composition", "--", "Video-Vertical"]);
  console.log("\nVertical video generated: output/video/video.mp4");
} else {
  // Horizontal: full pipeline
  run("pnpm", ["render:all"]);
  console.log("\nVideo generated: output/video/video.mp4");
}
console.log("Title: " + top.title);

// Step 3: Optional publish
if (doPublish) {
  console.log("\nPublishing to all platforms...");
  run("pnpm", ["upload:all"]);
}
