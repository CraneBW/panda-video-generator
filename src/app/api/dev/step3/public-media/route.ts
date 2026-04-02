import { createWriteStream } from "fs";
import { mkdirSync } from "fs";
import { unlinkSync } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { isScriptRunnerEnabled } from "../../../../../lib/dev-script-runner";

export const runtime = "nodejs";

/** Large background clips may upload slowly over local dev. */
export const maxDuration = 300;

const MAX_BG_VIDEO_BYTES = 280 * 1024 * 1024;
const MAX_BGM_BYTES = 48 * 1024 * 1024;

const KINDS = {
  "bg-video": {
    relDir: "public/video" as const,
    filename: "0.mp4" as const,
    maxBytes: MAX_BG_VIDEO_BYTES,
    mimeOk: new Set(["video/mp4", "video/webm", "video/quicktime"]),
    extOk: new Set([".mp4", ".webm", ".mov"]),
  },
  bgm: {
    relDir: "public/bgm" as const,
    filename: "0.mp3" as const,
    maxBytes: MAX_BGM_BYTES,
    mimeOk: new Set(["audio/mpeg", "audio/mp3"]),
    extOk: new Set([".mp3"]),
  },
} as const;

type MediaKind = keyof typeof KINDS;

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0) return "";
  return name.slice(i).toLowerCase();
}

function isKind(s: string): s is MediaKind {
  return s === "bg-video" || s === "bgm";
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const kindRaw = form.get("kind");
  if (typeof kindRaw !== "string" || !isKind(kindRaw)) {
    return NextResponse.json(
      { error: 'Field "kind" must be "bg-video" or "bgm".' },
      { status: 400 },
    );
  }
  const spec = KINDS[kindRaw];

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: 'Field "file" must be a non-empty file.' },
      { status: 400 },
    );
  }

  if (file.size > spec.maxBytes) {
    return NextResponse.json(
      {
        error: `File too large (max ${Math.floor(spec.maxBytes / (1024 * 1024))} MiB).`,
      },
      { status: 400 },
    );
  }

  const ext = extOf(file.name);
  const type = (file.type || "").toLowerCase().split(";")[0].trim();
  if (!spec.extOk.has(ext)) {
    return NextResponse.json(
      {
        error: `Unsupported extension for ${kindRaw}. Expected one of: ${[...spec.extOk].join(", ")}`,
      },
      { status: 400 },
    );
  }
  if (
    type &&
    type !== "application/octet-stream" &&
    !spec.mimeOk.has(type)
  ) {
    return NextResponse.json(
      {
        error: `Unsupported MIME type "${type}" for ${kindRaw}.`,
      },
      { status: 400 },
    );
  }

  const dir = join(process.cwd(), spec.relDir);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, spec.filename);

  const webStream = file.stream();
  const nodeReadable = Readable.fromWeb(
    webStream as import("stream/web").ReadableStream,
  );

  try {
    await pipeline(nodeReadable, createWriteStream(dest));
  } catch (e) {
    try {
      unlinkSync(dest);
    } catch {
      /* ignore */
    }
    const message = e instanceof Error ? e.message : "Write failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    path: `${spec.relDir}/${spec.filename}`,
    bytes: file.size,
    originalName: file.name.slice(0, 240),
  });
}
