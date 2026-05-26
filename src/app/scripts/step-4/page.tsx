"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Square } from "lucide-react";
import { outputVideoBasenameForComposition } from "../../../lib/remotion-compositions";
import { useRunScriptStreamLog } from "../use-run-script-stream-log";
import { useStickToBottomLogScroll } from "../use-stick-to-bottom-log-scroll";

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

const PLAYWRIGHT_PLATFORMS = [
  {
    labelZh: "B站",
    loginScript: "login:bilibili",
    uploadScript: "upload:bilibili",
  },
  {
    labelZh: "抖音",
    loginScript: "login:douyin",
    uploadScript: "upload:douyin",
  },
  {
    labelZh: "快手",
    loginScript: "login:kuaishou",
    uploadScript: "upload:kuaishou",
  },
  {
    labelZh: "视频号",
    loginScript: "login:weixin-video",
    uploadScript: "upload:weixin-video",
  },
  {
    labelZh: "YouTube",
    loginScript: "login:youtube",
    uploadScript: "upload:youtube",
  },
] as const;

/** Default rendered output on disk; same default as STEP3 `Video` composite. */
const PREVIEW_COMPOSITION_ID = "Video";

const RENDERED_VIDEO_PATH = "output/video/video.mp4";
const RENDERED_COVER_PATH = "output/video/cover.jpg";

export default function ScriptsStep4Page() {
  const { log, setLog, appendStream, appendImmediate, flushPending } =
    useRunScriptStreamLog();
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runningLabel, setRunningLabel] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const { logPreRef, onLogPreScroll } = useStickToBottomLogScroll(log, running);
  const abortRef = useRef<AbortController | null>(null);
  const abortByUserRef = useRef(false);

  // Load video title from rendered output for pva upload
  useEffect(() => {
    fetch("/video/title.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.title) setVideoTitle(data.title);
      })
      .catch(() => {
        /* not available */
      });
  }, []);

  const previewSrc = useMemo(() => {
    const q = new URLSearchParams({
      composition: PREVIEW_COMPOSITION_ID,
      v: String(previewNonce),
    });
    return `/api/dev/step3/output-video?${q.toString()}`;
  }, [previewNonce]);

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

  const runScript = useCallback(
    async (script: string, labelZh: string) => {
      if (running) return;
      abortByUserRef.current = false;
      const ac = new AbortController();
      abortRef.current = ac;
      setRunning(true);
      setRunningLabel(labelZh);
      const stamp = new Date().toLocaleString();
      appendImmediate(
        `\n──────── ${stamp} · STEP4 · pva · ${script}（${labelZh}）────────\n`,
      );
      // Pass rendered video paths to pva upload scripts
      const env = script.startsWith("upload:")
        ? {
            VIDEO_PATH: RENDERED_VIDEO_PATH,
            VIDEO_COVER: RENDERED_COVER_PATH,
            ...(videoTitle ? { VIDEO_TITLE: videoTitle } : {}),
          }
        : undefined;
      try {
        await consumeRunScript({ script, env }, ac.signal);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          if (abortByUserRef.current) {
            appendImmediate(
              "\n[已中止] 你已取消本次运行；服务端子进程会收到 SIGTERM。\n",
            );
          } else {
            appendImmediate(
              "\n[已中止] 浏览器请求被中断。自动化较耗时，请保持本页打开。\n",
            );
          }
        } else {
          appendImmediate(
            `\n[错误] ${e instanceof Error ? e.message : String(e)}\n`,
          );
        }
      } finally {
        setRunning(false);
        setRunningLabel(null);
        abortRef.current = null;
        abortByUserRef.current = false;
      }
    },
    [appendImmediate, consumeRunScript, running, videoTitle],
  );

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
          STEP4：自动化上传。
        </p>
        <p className="mt-2 max-w-3xl text-xs text-zinc-500">
          基于 <code className="rounded bg-zinc-900 px-1 text-zinc-400">pva</code> 本地依赖的浏览器自动化框架。浏览器内核通过 postinstall 自动安装。
        </p>
        <p className="text-xs text-zinc-500">
          左侧先做各平台登录，再在右侧上传；登录状态存储在 pva 的{" "}
          <code className="rounded bg-zinc-900 px-1 text-zinc-400">
            playwright/.auth/
          </code>
          ，有效期内一般不用重复登录。
        </p>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">平台登录</h2>
            <p className="text-xs text-zinc-500">
              多数平台登录一次可以长期使用，但也有部分平台需要每次登录。
            </p>
            <p className="text-xs text-zinc-500">
              例如微信视频号只有一小时有效期.
            </p>
            <div className="flex flex-col gap-2">
              {PLAYWRIGHT_PLATFORMS.map((p) => (
                <button
                  key={p.loginScript}
                  type="button"
                  onClick={() => runScript(p.loginScript, `${p.labelZh} 登录`)}
                  disabled={running}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-45"
                >
                  {running && runningLabel === `${p.labelZh} 登录` ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      运行中…
                    </>
                  ) : (
                    `${p.labelZh} · 登录`
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-200">上传视频</h2>
            <p className="text-xs text-zinc-500">
              使用已渲染成片（可在下方预览）
            </p>
            <p className="text-xs text-zinc-500">
              路径：<code className="rounded bg-zinc-900 px-1">{RENDERED_VIDEO_PATH}</code>
              {videoTitle ? (
                <>
                  ，标题：<code className="rounded bg-zinc-900 px-1">{videoTitle}</code>
                </>
              ) : null}
            </p>
            <div className="flex flex-col gap-2">
              {PLAYWRIGHT_PLATFORMS.map((p) => (
                <button
                  key={p.uploadScript}
                  type="button"
                  onClick={() => runScript(p.uploadScript, `${p.labelZh} 上传`)}
                  disabled={running}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-app-cta px-4 py-2.5 text-sm font-medium text-app-cta-foreground hover:bg-app-cta-hover disabled:opacity-45"
                >
                  {running && runningLabel === `${p.labelZh} 上传` ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      运行中…
                    </>
                  ) : (
                    `${p.labelZh} · 上传`
                  )}
                </button>
              ))}
              {/* <button
                type="button"
                onClick={() => runScript("upload:all", "全部平台顺序上传")}
                disabled={running}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-app-cta/45 bg-app-cta/14 px-4 py-2.5 text-sm font-medium text-app-cta-foreground hover:bg-app-cta/24 disabled:opacity-45"
              >
                {running && runningLabel === "全部平台顺序上传" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    运行中…
                  </>
                ) : (
                  "全部平台 · 顺序上传"
                )}
              </button> */}
            </div>
          </section>
        </div>

        <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-300">成片预览</h2>
            <code className="max-w-[min(100%,18rem)] truncate text-right text-xs text-zinc-500 sm:max-w-none">
              output/video/
              {outputVideoBasenameForComposition(PREVIEW_COMPOSITION_ID)}.mp4
            </code>
          </div>
          <p className="text-xs text-zinc-500">
            与第三步渲染产物相同；上传脚本自动使用该文件及封面（VIDEO_PATH={RENDERED_VIDEO_PATH}）。
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
                "无法加载预览。请先在第三步完成渲染，或确认上述 mp4 已生成。",
              )
            }
          />
          {previewError ? (
            <p className="text-xs text-amber-400">{previewError}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800/70 pt-3">
            <button
              type="button"
              onClick={() => {
                setPreviewNonce((n) => n + 1);
                setPreviewError(null);
              }}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              刷新预览
            </button>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
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

        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-400">运行日志</span>
          <pre
            ref={logPreRef}
            onScroll={onLogPreScroll}
            className="max-h-[min(55vh,480px)] overflow-auto rounded-xl border border-zinc-800 bg-black/80 p-4 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap"
            aria-live="polite"
          >
            {log || "（尚无输出）"}
          </pre>
        </div>
      </main>
    </div>
  );
}
