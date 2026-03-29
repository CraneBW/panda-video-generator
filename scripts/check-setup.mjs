/**
 * Environment sanity check (replaces check-setup.sh); works on Windows.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "./lib/project-root.mjs";
import { getFfmpegPath } from "./lib/resolve-ffmpeg.mjs";

let fail = 0;

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

console.log("=== Panda Video Generator — 环境检查 ===");
console.log("");

if (nodeVersionOk()) {
  console.log(`[OK] node ${process.version}（需要 >=20.9，请查看 package.json engines）`);
} else {
  console.log(
    `[!!] node ${process.version} — 需要 >=20.9：https://nodejs.org/`,
  );
  fail = 1;
}

if (hasCmd("pnpm", ["-v"])) {
  try {
    const v = spawnSync("pnpm", ["-v"], {
      encoding: "utf8",
      shell: true,
    }).stdout?.trim();
    console.log(`[OK] pnpm ${v}`);
  } catch {
    console.log("[OK] pnpm");
  }
} else {
  console.log(
    "[!!] 未找到 pnpm — 尝试：corepack enable && corepack prepare pnpm@latest --activate",
  );
  fail = 1;
}

const ffBin = getFfmpegPath();
if (spawnSync(ffBin, ["-version"], { stdio: "pipe", shell: false }).status === 0) {
  const line = spawnSync(ffBin, ["-version"], {
    encoding: "utf8",
    shell: false,
  }).stdout?.split("\n")[0];
  const via =
    ffBin === "ffmpeg"
      ? "（PATH 系统 ffmpeg，备用）"
      : "（ffmpeg-static，随依赖安装）";
  console.log(`[OK] ffmpeg ${via} ${line ?? ""}`.trim());
} else {
  console.log(
    "[--] ffmpeg 不可用 — 请先在本仓库根目录执行 pnpm install（需在 pnpm-workspace 中允许 ffmpeg-static 构建脚本）。",
  );
  console.log(
    "    若捆绑二进制无法执行，可安装系统 ffmpeg 到 PATH，或运行: pnpm install:project -- --install-system-ffmpeg",
  );
}

const pkg = path.join(projectRoot, "package.json");
const nm = path.join(projectRoot, "node_modules");
if (fs.existsSync(pkg) && fs.existsSync(nm)) {
  console.log("[OK] node_modules 存在（如果刚克隆，请运行 pnpm install）");
} else {
  console.log("[--] 在仓库根目录运行 pnpm install");
}

console.log("");
console.log(
  "Playwright：运行 pnpm install 时获取 Chromium（需要网络）。",
);
console.log(
  "如果登录/上传失败：pnpm exec playwright install --with-deps chromium",
);
console.log("");

process.exit(fail);
