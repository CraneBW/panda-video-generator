/**
 * Sync (--require-tts) → Remotion render Video → cover (PNG/JPG).
 */
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/project-root.mjs";
import { hasFfmpeg, run, runFfmpeg } from "./lib/run-cmd.mjs";
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
const COVER_JPG = path.join(projectRoot, "output", "video", "cover.jpg");
const COVER_PNG = path.join(projectRoot, "output", "video", "cover.png");

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

console.log("");
console.log(`${YELLOW}🖼️  Cover image...${NC}`);

let coverGenerated = false;

function tryStill(extraProps) {
  const args = [
    "exec",
    "remotion",
    "still",
    "Cover-Still",
    COVER_PNG,
    ...(extraProps ? [`--props=${extraProps}`] : []),
  ];
  return run("pnpm", args) === 0;
}

if (propsFile && fs.existsSync(propsFile)) {
  if (tryStill(propsFile)) {
    console.log(`${GREEN}✅ Cover PNG: ${COVER_PNG}${NC}`);
    coverGenerated = true;
  }
}
if (!coverGenerated && tryStill()) {
  console.log(`${GREEN}✅ Cover PNG: ${COVER_PNG}${NC}`);
  coverGenerated = true;
}

if (coverGenerated && hasFfmpeg()) {
  if (
    runFfmpeg([
      "-i",
      COVER_PNG,
      "-frames:v",
      "1",
      "-update",
      "1",
      "-q:v",
      "2",
      COVER_JPG,
      "-y",
      "-loglevel",
      "warning",
    ]) === 0
  ) {
    console.log(`${GREEN}✅ Cover JPG: ${COVER_JPG}${NC}`);
  }
}

if (!coverGenerated && hasFfmpeg()) {
  console.log(
    `${YELLOW}⚠️  Remotion still failed, trying ffmpeg from first frame...${NC}`,
  );
  if (
    runFfmpeg([
      "-ss",
      "0",
      "-i",
      OUTPUT_FILE,
      "-vframes",
      "1",
      COVER_JPG,
      "-y",
      "-loglevel",
      "warning",
    ]) === 0
  ) {
    console.log(`${GREEN}✅ Cover JPG: ${COVER_JPG}${NC}`);
    coverGenerated = true;
  }
}

if (propsFile && fs.existsSync(propsFile)) {
  fs.rmSync(propsFile, { force: true });
}

console.log("");
console.log(`${GREEN}✅ Render done: ${OUTPUT_FILE}${NC}`);
