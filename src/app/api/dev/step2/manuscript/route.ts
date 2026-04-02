import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { NextResponse } from "next/server";
import { isScriptRunnerEnabled } from "../../../../../lib/dev-script-runner";

export const runtime = "nodejs";

const REL_PATH = join("output", "spider", "input.txt");
const TITLE_REL_PATH = join("output", "spider", "title.json");
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_TITLE_BYTES = 16_384;

function readTitleJson(cwd: string): { title: string; fileExists: boolean } {
  const abs = join(cwd, TITLE_REL_PATH);
  if (!existsSync(abs)) {
    return { title: "", fileExists: false };
  }
  try {
    const raw = readFileSync(abs, "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_TITLE_BYTES) {
      return { title: "", fileExists: true };
    }
    const data = JSON.parse(raw) as { title?: unknown };
    const t = data.title;
    return {
      title: typeof t === "string" ? t : "",
      fileExists: true,
    };
  } catch {
    return { title: "", fileExists: true };
  }
}

export async function GET() {
  if (!isScriptRunnerEnabled()) {
    return NextResponse.json(
      {
        error:
          "This API is only available in development or when ALLOW_SCRIPT_RUNNER=1.",
      },
      { status: 403 },
    );
  }

  const cwd = process.cwd();
  const normPath = (p: string) => p.replace(/\\/g, "/");
  const { title, fileExists: titleFileExists } = readTitleJson(cwd);

  const abs = join(cwd, REL_PATH);
  if (!existsSync(abs)) {
    return NextResponse.json({
      exists: false,
      path: normPath(REL_PATH),
      content: "",
      title,
      titlePath: normPath(TITLE_REL_PATH),
      titleFileExists,
    });
  }

  const buf = readFileSync(abs);
  if (buf.length > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File exceeds ${MAX_BYTES} bytes`,
        exists: true,
        path: normPath(REL_PATH),
        title,
        titlePath: normPath(TITLE_REL_PATH),
        titleFileExists,
      },
      { status: 413 },
    );
  }

  return NextResponse.json({
    exists: true,
    path: normPath(REL_PATH),
    content: buf.toString("utf8"),
    title,
    titlePath: normPath(TITLE_REL_PATH),
    titleFileExists,
  });
}

export async function POST(request: Request) {
  if (!isScriptRunnerEnabled()) {
    return NextResponse.json(
      {
        error:
          "This API is only available in development or when ALLOW_SCRIPT_RUNNER=1.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected JSON object" }, { status: 400 });
  }

  const content = (body as { content?: unknown }).content;
  if (typeof content !== "string") {
    return NextResponse.json({ error: "`content` must be a string" }, { status: 400 });
  }

  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_BYTES) {
    return NextResponse.json(
      { error: `Content exceeds ${MAX_BYTES} bytes` },
      { status: 413 },
    );
  }

  const cwd = process.cwd();
  const abs = join(cwd, REL_PATH);
  try {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Write failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: REL_PATH.replace(/\\/g, "/"),
  });
}
