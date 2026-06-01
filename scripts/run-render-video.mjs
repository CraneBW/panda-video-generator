/**
 * Sync (--require-tts) → Remotion render Video → cover (PNG/JPG).
 */
import fs from "node:fs";
import path from "node:path";
import {
  generateCoverJpgFromMp4,
  generateCoverStillAndJpg,
} from "./lib/generate-remotion-cover.mjs";
import { projectRoot } from "./lib/project-root.mjs";
import { hasFfmpeg, run } from "./lib/run-cmd.mjs";
import { writeRenderPropsFromTitle } from "./lib/render-props.mjs";

const BLUE = "\x1b[0;34m";
const GREEN = "\x1b[0;32m";
const YELLOW = "\x1b[1;33m";
const RED = "\x1b[0;31m";
const NC = "\x1b[0m";

function resolvePath(relOrAbs) {
  if (path.isAbsolute(relOrAbs)) return relOrAbs;
  return path.join(projectRoot, relOrAbs);
}

const VIDEO_PUBLIC_DIR = resolvePath(
  process.env.VIDEO_PUBLIC_DIR ?? "public/video",
);

const TITLE_PUBLIC = path.join(VIDEO_PUBLIC_DIR, "title.json");
const OUTPUT_FILE = path.join(projectRoot, "output", "video", "video.mp4");
const PROPS_PATH = path.join(projectRoot, "output", "video", "render-props.json");

console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
console.log(`${BLUE}🎬 Remotion video + cover${NC}`);
console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}`);
console.log("");

if (
  run("node", [
    path.join(projectRoot, "scripts", "sync-outputs-to-public.mjs"),
    "--require-tts",
  ]) !== 0
) {
  process.exit(1);
}
console.log("");

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

let propsFile = "";
if (fs.existsSync(TITLE_PUBLIC)) {
  if (writeRenderPropsFromTitle(TITLE_PUBLIC, PROPS_PATH)) {
    propsFile = PROPS_PATH;
  }
} else {
  console.log(
    `${YELLOW}⚠️  No ${TITLE_PUBLIC} — using default title for render${NC}`,
  );
}

// Clear Remotion bundle cache to ensure latest static files are used
const remotionCache = path.join(projectRoot, ".remotion", "bundle");
if (fs.existsSync(remotionCache)) {
  fs.rmSync(remotionCache, { recursive: true, force: true });
  console.log(`${BLUE}Cleared Remotion bundle cache${NC}`);
}

// Remove old output to force fresh render
if (fs.existsSync(OUTPUT_FILE)) {
  fs.rmSync(OUTPUT_FILE, { force: true });
  console.log(`${BLUE}Removed previous video output${NC}`);
}

const renderBase = [
  "exec",
  "remotion",
  "render",
  "Video",
  OUTPUT_FILE,
  "--codec=h264",
  "--crf=23",
];
const renderArgs =
  propsFile && fs.existsSync(propsFile)
    ? [...renderBase, `--props=${propsFile}`]
    : renderBase;

console.log(`${BLUE}🎬 Rendering Video → ${OUTPUT_FILE}${NC}`);
if (run("pnpm", renderArgs) !== 0) {
  console.log(`${RED}❌ Failed to render video${NC}`);
  if (propsFile && fs.existsSync(propsFile)) fs.rmSync(propsFile, { force: true });
  process.exit(1);
}

const { pngOk } = generateCoverStillAndJpg(
  propsFile && fs.existsSync(propsFile) ? propsFile : undefined,
);
if (!pngOk && hasFfmpeg()) {
  generateCoverJpgFromMp4(OUTPUT_FILE);
}

if (propsFile && fs.existsSync(propsFile)) {
  fs.rmSync(propsFile, { force: true });
}

console.log("");
console.log(`${GREEN}✅ Render done: ${OUTPUT_FILE}${NC}`);
