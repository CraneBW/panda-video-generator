"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Square } from "lucide-react";
import {
  outputVideoBasenameForComposition,
  REMOTION_RENDER_OPTIONS,
} from "../../../lib/remotion-compositions";
import { NextStepFab } from "../next-step-fab";
import { usePersistedJson } from "../use-persisted-json";
import { useRunScriptStreamLog } from "../use-run-script-stream-log";

type SseLine =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "error"; message: string }
  | { type: "exit"; code: number | null; signal: string | null };

function parseSseBuffer(buffer: string): { events: SseLine[]; rest: string } {
  const events: SseLine[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const block of parts) {
    const line = block.trimStart();
    if (!line.startsWith("data: ")) continue;
    try {
      events.push(JSON.parse(line.slice(6)) as SseLine);
    } catch {
      /* ignore */
    }
  }
  return { events, rest };
}

const DEFAULT_COMPOSITION =
  REMOTION_RENDER_OPTIONS.find((o) => o.id === "Video")?.id ??
  REMOTION_RENDER_OPTIONS[0]?.id ??
  "Video";

const ALLOWED_COMPOSITION_IDS = new Set(
  REMOTION_RENDER_OPTIONS.map((o) => o.id),
);

type Step3Persisted = { compositionId: string };

const STEP3_DEFAULT: Step3Persisted = {
  compositionId: DEFAULT_COMPOSITION,
};

function normalizeStep3Persisted(
  raw: unknown,
  d: Step3Persisted,
): Step3Persisted {
  if (!raw || typeof raw !== "object") return d;
  const c = (raw as { compositionId?: unknown }).compositionId;
  if (typeof c === "string" && ALLOWED_COMPOSITION_IDS.has(c)) {
    return { compositionId: c };
  }
  return d;
}

export default function ScriptsStep3Page() {
  const [s3, setS3] = usePersistedJson(
    "step3",
    STEP3_DEFAULT,
    normalizeStep3Persisted,
  );
  const compositionId = s3.compositionId;
  const { log, setLog, appendStream, appendImmediate, flushPending } =
    useRunScriptStreamLog();
  const [running, setRunning] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const abortByUserRef = useRef(false);
  const logEndRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log]);

  useEffect(() => {
    setPreviewError(null);
  }, [compositionId]);

  const stopRun = useCallback(() => {
    abortByUserRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const consumeRunScript = useCallback(
    async (
      payload: { script: string; args?: string[]; env?: Record<string, string> },
      signal: AbortSignal,
    ): Promise<number | null> => {
      const res = await fetch("/api/dev/run-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        appendImmediate(
          `[runner] HTTP ${res.status} ${errJson.error ?? ""}\n`,
        );
        return null;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        appendImmediate("[runner] No response body\n");
        return null;
      }
      const decoder = new TextDecoder();
      let exitCode: number | null = null;
      let carry = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        carry += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseBuffer(carry);
        carry = rest;
        for (const ev of events) {
          if (ev.type === "stdout") appendStream(ev.text);
          else if (ev.type === "stderr") appendStream(ev.text);
          else if (ev.type === "error")
            appendImmediate(`[spawn error] ${ev.message}\n`);
          else if (ev.type === "exit") {
            exitCode = ev.code;
            appendImmediate(
              `\n[exit] code=${ev.code} signal=${ev.signal ?? "null"}\n`,
            );
          }
        }
      }
      flushPending();
      return exitCode;
    },
    [appendImmediate, appendStream, flushPending],
  );

  const run = useCallback(async () => {
    if (running) return;
    const id = compositionId.trim();
    if (!id) {
      appendImmediate("[提示] 请选择合成（Composition）。\n");
      return;
    }
    abortByUserRef.current = false;
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    const stamp = new Date().toLocaleString();
    appendImmediate(
      `\n──────── ${stamp} · STEP3 · render:composition · ${id} ────────\n`,
    );
    try {
      const code = await consumeRunScript(
        { script: "render:composition", args: [id] },
        ac.signal,
      );
      if (code === 0) {
        setPreviewNonce((n) => n + 1);
        setPreviewError(null);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (abortByUserRef.current) {
          appendImmediate(
            "\n[已中止] 你已取消本次运行；服务端子进程会收到 SIGTERM。\n",
          );
        } else {
          appendImmediate(
            "\n[已中止] 浏览器请求被中断。渲染较耗时，请保持本页打开；也可终端执行：pnpm run render:composition -- <合成 ID>\n",
          );
        }
      } else {
        appendImmediate(
          `\n[错误] ${e instanceof Error ? e.message : String(e)}\n`,
        );
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      abortByUserRef.current = false;
    }
  }, [appendImmediate, compositionId, consumeRunScript, running]);

  const selectedHint = useMemo(
    () => REMOTION_RENDER_OPTIONS.find((o) => o.id === compositionId)?.hintZh,
    [compositionId],
  );

  const previewSrc = useMemo(() => {
    const q = new URLSearchParams({
      composition: compositionId.trim() || "Video",
      v: String(previewNonce),
    });
    return `/api/dev/step3/output-video?${q.toString()}`;
  }, [compositionId, previewNonce]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-black text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 px-4 py-3 sm:px-6">
        <Link
          href="/scripts"
          className="inline-flex items-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2.5 text-base font-medium text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50"
        >
          <ArrowLeft className="size-5 shrink-0" aria-hidden />
          返回步骤列表
        </Link>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          STEP3：视频渲染
        </p>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-24 sm:px-6 sm:pb-20">

        <div className="space-y-2">
          <label
            htmlFor="step3-composition"
            className="block text-sm font-medium text-zinc-300"
          >
            合成（Composition）
          </label>
          <select
            id="step3-composition"
            value={compositionId}
            onChange={(e) =>
              setS3((p) => ({ ...p, compositionId: e.target.value }))
            }
            disabled={running}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2.5 text-sm text-zinc-100 outline-offset-2 focus:outline focus:outline-2 focus:outline-app-cta/65 disabled:opacity-50"
          >
            {REMOTION_RENDER_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.labelZh}（{o.id}）
              </option>
            ))}
          </select>
          {selectedHint ? (
            <p className="text-xs text-zinc-500">{selectedHint}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={run}
            disabled={running || !compositionId.trim()}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-app-cta px-4 py-2.5 text-sm font-medium text-app-cta-foreground hover:bg-app-cta-hover disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                渲染中
              </>
            ) : (
              "开始渲染"
            )}
          </button>
          <button
            type="button"
            onClick={stopRun}
            disabled={!running}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
          >
            <Square className="size-4" aria-hidden />
            中止
          </button>
          <button
            type="button"
            onClick={() => setLog("")}
            disabled={running}
            className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline disabled:opacity-40"
          >
            清空日志
          </button>
        </div>

        <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-300">成片预览</h2>
            <button
              type="button"
              onClick={() => {
                setPreviewNonce((n) => n + 1);
                setPreviewError(null);
              }}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              刷新预览
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            来源{" "}
            <code className="rounded bg-zinc-900 px-1 text-zinc-400">
              output/video/{outputVideoBasenameForComposition(compositionId)}.mp4
            </code>
          </p>
          <video
            key={previewSrc}
            src={previewSrc}
            controls
            playsInline
            className="aspect-video w-full rounded-lg border border-zinc-800 bg-black object-contain"
            onLoadedData={() => setPreviewError(null)}
            onError={() =>
              setPreviewError(
                "无法加载预览。请先完成渲染，或确认上面的视频文件已存在。",
              )
            }
          />
          {previewError ? (
            <p className="text-xs text-amber-400">{previewError}</p>
          ) : null}
        </section>

        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-400">运行日志</span>
          <pre
            className="max-h-[min(55vh,480px)] overflow-auto rounded-xl border border-zinc-800 bg-black/80 p-4 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap"
            aria-live="polite"
          >
            {log || "（尚无输出）"}
            <span ref={logEndRef} />
          </pre>
        </div>
      </main>
      <NextStepFab href="/scripts/step-4" />
    </div>
  );
}
