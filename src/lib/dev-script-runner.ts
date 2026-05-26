import { readFileSync } from "fs";
import { join } from "path";

const BLOCKED = new Set(["postinstall", "dev", "automation"]);

const MAX_ARGS = 64;
const MAX_ARG_LENGTH = 2048;

export function getPackageScripts(): Record<string, string> {
  const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  return pkg.scripts ?? {};
}

export function getAllowedScriptNames(): string[] {
  const scripts = getPackageScripts();
  return Object.keys(scripts)
    .filter((name) => !BLOCKED.has(name))
    .sort((a, b) => a.localeCompare(b));
}

export function assertScriptAllowed(name: string): void {
  if (BLOCKED.has(name)) {
    throw new Error(`Script "${name}" is not allowed from the runner UI`);
  }
  const scripts = getPackageScripts();
  if (!(name in scripts)) {
    throw new Error(`Unknown script: ${name}`);
  }
}

export function normalizeRunnerArgs(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new Error("args must be an array of strings");
  }
  if (raw.length > MAX_ARGS) {
    throw new Error(`At most ${MAX_ARGS} arguments are allowed`);
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") {
      throw new Error("Each arg must be a string");
    }
    const s = item.trim();
    if (s === "") continue;
    if (s.length > MAX_ARG_LENGTH) {
      throw new Error(`Each argument must be at most ${MAX_ARG_LENGTH} characters`);
    }
    out.push(s);
  }
  return out;
}

export function isScriptRunnerEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_SCRIPT_RUNNER === "1"
  );
}

/** Merged into `process.env` for `run-script` only (STEP1 / spider / STEP4 pva upload flows). */
const ALLOWED_PNPM_RUN_EXTRA_ENV_KEYS = new Set([
  "SPIDER_SOURCE",
  "CAPTION_INPUT_JSON",
  "TTS_INPUT_FILE",
  "DEEPSEEK_API_KEY",
  "LLM_PROVIDER",
  "MOONSHOT_API_KEY",
  "KIMI_API_KEY",
  "EDGE_TTS_VOICE",
  // pva upload env vars (STEP4)
  "VIDEO_PATH",
  "VIDEO_TITLE",
  "VIDEO_DESC",
  "VIDEO_TAGS",
  "VIDEO_COVER",
  "VIDEO_PRIVACY",
  "PVA_HEADLESS",
]);

const MAX_ENV_VALUE_LEN = 16384;

export function pickAllowedPnpmRunEnv(raw: unknown): Record<string, string> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("env must be an object with string values");
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_PNPM_RUN_EXTRA_ENV_KEYS.has(k)) continue;
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (t.length === 0) continue;
    if (t.length > MAX_ENV_VALUE_LEN) {
      throw new Error(`Environment value for ${k} is too long`);
    }
    out[k] = t;
  }
  return out;
}
