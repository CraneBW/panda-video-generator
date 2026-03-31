import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import {
  outputVideoBasenameForComposition,
  RENDER_COMPOSITION_CLI_IDS,
} from "../../../../../lib/remotion-compositions";
import { isScriptRunnerEnabled } from "../../../../../lib/dev-script-runner";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isScriptRunnerEnabled()) {
    return NextResponse.json(
      {
        error:
          "This API is only available in development or when ALLOW_SCRIPT_RUNNER=1.",
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const composition = searchParams.get("composition")?.trim() ?? "";
  if (!composition || !RENDER_COMPOSITION_CLI_IDS.has(composition)) {
    return NextResponse.json({ error: "Unknown composition" }, { status: 400 });
  }

  const base = outputVideoBasenameForComposition(composition);
  const abs = join(process.cwd(), "output", "video", `${base}.mp4`);
  if (!existsSync(abs)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const st = statSync(abs);
  const nodeStream = createReadStream(abs);
  const webStream = Readable.toWeb(nodeStream);

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(st.size),
      "Cache-Control": "no-store",
    },
  });
}
