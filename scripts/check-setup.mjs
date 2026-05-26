/**
 * Environment sanity check (replaces check-setup.sh); works on Windows.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/project-root.mjs";

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const RULE = "─".repeat(54);

/** Number of scored checks (info items 不计分). */
const TOTAL_CHECKS = 5;

let passed = 0;
let failed = 0;

function recordPass() {
  passed += 1;
}

function recordFail() {
  failed += 1;
}

function hasCmd(cmd, args = ["--version"]) {
  const r = spawnSync(cmd, args, { stdio: "ignore", shell: true });
  return r.status === 0;
}

function nodeVersionOk() {
  const m = /^v(\d+)\.(\d+)\.(\d+)/.exec(process.version);
  if (!m) return false;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return major > 20 || (major === 20 && minor >= 9);
}

/**
 * @param {"ok" | "fail" | "warn" | "skip" | "info"} level
 * @param {string} headline
 * @param {string[]} [details]
 */
function item(level, headline, details = []) {
  let icon, color;
  switch (level) {
    case "ok":
      icon = "✓";
      color = C.green;
      break;
    case "fail":
      icon = "✗";
      color = C.red;
      break;
    case "warn":
      icon = "⚠";
      color = C.yellow;
      break;
    case "info":
      icon = "ℹ";
      color = C.blue;
      break;
    case "skip":
      icon = "–";
      color = C.dim;
      break;
    default:
      icon = "?";
      color = C.reset;
  }

  console.log(`  ${color}${icon}${C.reset} ${color}${headline}${C.reset}`);
  for (const line of details) {
    console.log(`    ${C.dim}└ ${line}${C.reset}`);
  }
}

function section(title) {
  console.log("");
  console.log(`  ${C.cyan}${C.bold}${title}${C.reset}`);
  console.log(`  ${C.dim}${RULE}${C.reset}`);
}

/**
 * @returns {"ok" | "warn" | "skip"}
 */
function checkPuppeteerChrome() {
  const nm = path.join(projectRoot, "node_modules");
  if (!fs.existsSync(nm)) {
    item("skip", "Puppeteer（STEP1 通用网页）", [
      "依赖未安装，无法检测；完成 pnpm install 后将自动运行 postinstall。",
    ]);
    return "skip";
  }

  const r = spawnSync(
    "pnpm",
    ["--filter", "@panda-video-generator/spider", "exec", "puppeteer", "browsers", "list"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      shell: true,
      windowsHide: true,
    },
  );

  if (r.status !== 0) {
    item("warn", "Puppeteer（STEP1 通用网页）", [
      "未能列出已安装浏览器。",
      "→ node scripts/puppeteer-postinstall.mjs",
      "或设置环境变量 PUPPETEER_EXECUTABLE_PATH 指向本机 Chrome/Chromium。",
    ]);
    return "warn";
  }

  const out = (r.stdout ?? "").trim();
  const first = out.split("\n").find((l) => l.length) ?? "";
  if (!first.toLowerCase().includes("chrome")) {
    item("warn", "Puppeteer（STEP1 通用网页）", [
      "未检测到 Chrome for Testing；STEP1「通用网页」可能报错。",
      "→ node scripts/puppeteer-postinstall.mjs",
      "若 PUPPETEER_SKIP_CHROMIUM_DOWNLOAD 已开启，请先关闭再安装依赖。",
    ]);
    return "warn";
  }

  // Show short label (e.g. "chrome@144.0.7559.96") + platform
  const label = (first.split(" ")[0] ?? first).trim();
  const platform = first.includes("(") ? first.match(/\([^)]+\)/)?.[0] ?? "" : "";
  item("ok", "Puppeteer · Chrome for Testing", [`${label} ${platform}`.trim()]);
  return "ok";
}

function printScoreSummary() {
  const allPass = failed === 0 && passed === TOTAL_CHECKS;
  console.log("");
  console.log(`  ${C.dim}${RULE}${C.reset}`);
  if (allPass) {
    console.log(`  ${C.green}${C.bold}✅  ${passed}/${TOTAL_CHECKS}  全部通过${C.reset}`);
    console.log(`  ${C.dim}所有检查均已就绪，可以开始使用。${C.reset}`);
  } else {
    const scores = [`${C.green}✓ ${passed}/${TOTAL_CHECKS}${C.reset}`];
    if (failed > 0) {
      scores.push(`${C.red}✗ ${failed}/${TOTAL_CHECKS}${C.reset}`);
    }
    console.log(`  ${C.yellow}${C.bold}⚠  部分检查未通过${C.reset}`);
    console.log(`  ${C.dim}${scores.join("  ")}${C.reset}`);
    console.log(`  ${C.dim}请先处理上述「失败 / 注意」项，再运行其他命令。${C.reset}`);
  }
}

// ══════════════════════════════════════════════════════
//  Header
// ══════════════════════════════════════════════════════
console.log("");
console.log(`  ${C.cyan}${C.bold}═══  Panda Video Generator · 环境检查  ═══${C.reset}`);
console.log(`  ${C.dim}校验本地开发与流水线常用前提。未列出的项请参考 README。${C.reset}`);

// ══════════════════════════════════════════════════════
//  1. 运行时
// ══════════════════════════════════════════════════════
section("1. 运行时");

if (nodeVersionOk()) {
  recordPass();
  item("ok", `Node.js ${process.version}`, ["要求：>= 20.9（见 package.json engines）。"]);
} else {
  recordFail();
  item("fail", `Node.js ${process.version}`, [
    "要求：>= 20.9。",
    "安装或升级：https://nodejs.org/",
  ]);
}

if (hasCmd("pnpm", ["-v"])) {
  recordPass();
  const v = spawnSync("pnpm", ["-v"], {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  }).stdout?.trim();
  item("ok", `pnpm ${v ?? ""}`.trim(), ["包管理器可用于安装 workspace 与脚本依赖。"]);
} else {
  recordFail();
  item("fail", "pnpm 未找到", [
    "建议：corepack enable && corepack prepare pnpm@latest --activate",
  ]);
}

if (hasCmd("ffmpeg", ["-version"])) {
  recordPass();
  const line = spawnSync("ffmpeg", ["-version"], {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  }).stdout
    ?.split("\n")[0]
    ?.trim();
  const short = line ? line.replace(/Copyright.*$/, "").trim() : "已可用。";
  item("ok", "ffmpeg（系统 PATH）", [short]);
} else {
  recordFail();
  item("fail", "ffmpeg 不在 PATH 中", [
    "TTS 合并等步骤需要系统级 ffmpeg。",
    "macOS: brew install ffmpeg",
    "Ubuntu: sudo apt install ffmpeg",
    "Windows: winget install Gyan.FFmpeg",
    "或：pnpm install:project -- --install-system-ffmpeg（尝试自动安装）。",
  ]);
}

// ══════════════════════════════════════════════════════
//  2. 仓库与 node_modules
// ══════════════════════════════════════════════════════
section("2. 仓库与 node_modules");

const pkg = path.join(projectRoot, "package.json");
const nm = path.join(projectRoot, "node_modules");
if (fs.existsSync(pkg) && fs.existsSync(nm)) {
  recordPass();
  item("ok", "依赖目录已就绪", ["已检测到 package.json 与 node_modules。"]);
} else {
  recordFail();
  item("warn", "依赖可能未安装", [
    "请在仓库根目录执行：pnpm install",
    "或：pnpm install:project",
  ]);
}

// ══════════════════════════════════════════════════════
//  3. 浏览器组件
// ══════════════════════════════════════════════════════
section("3. 浏览器组件");

const puppeteerResult = checkPuppeteerChrome();
if (puppeteerResult === "ok") {
  recordPass();
} else {
  recordFail();
}

item("info", "pva · Playwright · Chromium", [
  "由 @panda-video-automation/pva 管理，postinstall 自动下载。",
  "用于各平台登录与上传自动化（bilibili / douyin / kuaishou / weixin / youtube）。",
  "若异常：pnpm exec playwright install chromium",
]);

printScoreSummary();
console.log("");

if (passed + failed !== TOTAL_CHECKS) {
  console.error(
    "[check-setup] Internal error: score mismatch. Expected",
    TOTAL_CHECKS,
    "got",
    passed + failed,
  );
  process.exit(1);
}

process.exit(failed > 0 ? 1 : 0);
