"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Headphones,
  Loader2,
  RefreshCw,
  Save,
  Square,
  StopCircle,
} from "lucide-react";
import {
  DEFAULT_AZURE_TTS_VOICE_VALUE,
  formatAzureVoiceOptionLabel,
  groupAzureTtsVoicesForSelect,
} from "../../../lib/azure-tts-voices";
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

type ManuscriptResponse = {
  exists: boolean;
  path: string;
  content: string;
  title?: string;
  titlePath?: string;
  titleFileExists?: boolean;
  error?: string;
};

type Step2Persisted = {
  edgeTtsVoice: string;
  videoTitle: string;
};

const STEP2_DEFAULT: Step2Persisted = {
  edgeTtsVoice: DEFAULT_AZURE_TTS_VOICE_VALUE,
  videoTitle: "",
};

function normalizeStep2Persisted(raw: unknown, d: Step2Persisted): Step2Persisted {
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const edgeTtsVoice =
    typeof o.edgeTtsVoice === "string" && o.edgeTtsVoice.trim() !== ""
      ? o.edgeTtsVoice
      : d.edgeTtsVoice;
  const videoTitle =
    typeof o.videoTitle === "string" ? o.videoTitle : d.videoTitle;
  return { edgeTtsVoice, videoTitle };
}

export default function ScriptsStep2Page() {
  const [s2, setS2] = usePersistedJson(
    "step2",
    STEP2_DEFAULT,
    normalizeStep2Persisted,
  );
  const videoTitle = s2.videoTitle;
  const edgeTtsVoice = s2.edgeTtsVoice;
  const [manuscriptPath, setManuscriptPath] = useState("");
  const [manuscript, setManuscript] = useState<string | null>(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(true);
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);
  const [titlePathDisplay, setTitlePathDisplay] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [titleSaving, setTitleSaving] = useState(false);
  const [titleFeedback, setTitleFeedback] = useState<string | null>(null);
  const { log, setLog, appendStream, appendImmediate, flushPending } =
    useRunScriptStreamLog();
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  /** True only when user clicked 中止 (vs tab refresh / navigate aborting fetch). */
  const abortByUserRef = useRef(false);
  const logEndRef = useRef<HTMLSpanElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const loadManuscript = useCallback(async () => {
    setManuscriptLoading(true);
    setManuscriptError(null);
    try {
      const res = await fetch("/api/dev/step2/manuscript");
      const json = (await res.json()) as ManuscriptResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setManuscriptPath(json.path ?? "");
      const t = json.title ?? "";
      if (t !== "") {
        setS2((prev) => ({ ...prev, videoTitle: t }));
      }
      setSavedTitle(t);
      setTitlePathDisplay(json.titlePath ?? "output/spider/title.json");
      setTitleFeedback(null);
      if (json.exists) {
        setManuscript(json.content ?? "");
      } else {
        setManuscript(null);
      }
    } catch (e) {
      setManuscriptError(
        e instanceof Error ? e.message : "无法读取文稿",
      );
      setManuscript(null);
      setS2((prev) => ({ ...prev, videoTitle: "" }));
      setSavedTitle("");
    } finally {
      setManuscriptLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManuscript();
  }, [loadManuscript]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log]);

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
    if (manuscript === null) {
      appendImmediate("[提示] 还没有口播稿，请先在 STEP1 生成或保存。\n");
      return;
    }
    const voice = edgeTtsVoice.trim() || DEFAULT_AZURE_TTS_VOICE_VALUE;
    abortByUserRef.current = false;
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    const stamp = new Date().toLocaleString();
    appendImmediate(
      `\n──────── ${stamp} · STEP2 · tts · EDGE_TTS_VOICE=${voice} ────────\n`,
    );
    try {
      await consumeRunScript(
        {
          script: "tts",
          env: { EDGE_TTS_VOICE: voice },
        },
        ac.signal,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        if (abortByUserRef.current) {
          appendImmediate(
            "\n[已中止] 你已取消本次运行（点击了「中止」）；服务端子进程会收到 SIGTERM。\n",
          );
        } else {
          appendImmediate(
            "\n[已中止] 请求被中断（例如刷新或关了标签）。TTS 较久，请尽量别关页；若需命令行可运行 pnpm tts。\n",
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
  }, [appendImmediate, consumeRunScript, edgeTtsVoice, manuscript, running]);

  const playTtsPreview = useCallback(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    setPreviewHint(null);
    el.pause();
    el.currentTime = 0;
    el.src = `/tts/audio.mp3?t=${Date.now()}`;
    const p = el.play();
    if (p !== undefined) {
      p.catch((err) => {
        setPreviewPlaying(false);
        setPreviewHint(
          err instanceof Error
            ? err.message
            : "播放失败，请先执行 TTS 或检查 public/tts/audio.mp3",
        );
      });
    }
  }, []);

  const stopTtsPreview = useCallback(() => {
    const el = previewAudioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setPreviewPlaying(false);
    setPreviewHint(null);
  }, []);

  const voiceGroups = useMemo(() => groupAzureTtsVoicesForSelect(), []);

  const titleDirty =
    videoTitle.trim() !== savedTitle.trim();

  const saveTitle = useCallback(async () => {
    if (titleSaving || running) return;
    setTitleSaving(true);
    setTitleFeedback(null);
    try {
      const res = await fetch("/api/dev/step2/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: videoTitle }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        title?: string;
        error?: string;
      };
      if (!res.ok) {
        setTitleFeedback(json.error ?? `保存失败（${res.status}）`);
        return;
      }
      const next =
        typeof json.title === "string" ? json.title : videoTitle.trim();
      setS2((prev) => ({ ...prev, videoTitle: next }));
      setSavedTitle(next);
      setTitleFeedback(
        "已保存至 output/spider/title.json 与 public/video/title.json（Remotion 读取后者）。",
      );
    } catch (e) {
      setTitleFeedback(
        e instanceof Error ? e.message : "保存失败",
      );
    } finally {
      setTitleSaving(false);
    }
  }, [running, titleSaving, videoTitle]);

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
          STEP2：配音和字幕
        </p>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-24 sm:px-6 sm:pb-20">
        <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-300">
              当前文稿
            </h2>
            <div className="flex items-center gap-2">
              {manuscriptPath ? (
                <code className="text-xs text-zinc-500">
                  {manuscriptPath}
                </code>
              ) : null}
              <button
                type="button"
                onClick={loadManuscript}
                disabled={manuscriptLoading || running}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                <RefreshCw
                  className={`size-3.5 ${manuscriptLoading ? "animate-spin" : ""}`}
                  aria-hidden
                />
                刷新
              </button>
            </div>
          </div>
          {manuscriptError ? (
            <p className="text-sm text-amber-400">{manuscriptError}</p>
          ) : manuscriptLoading ? (
            <p className="text-sm text-zinc-500">正在读取…</p>
          ) : manuscript === null ? (
            <p className="text-sm leading-relaxed text-zinc-500">
              尚未找到文稿文件。请先在 STEP1 生成或保存{" "}
              <code className="rounded bg-zinc-900 px-1 text-zinc-400">
                output/spider/input.txt
              </code>
              。
            </p>
          ) : (
            <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-800/80 bg-black/60 p-3 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {manuscript || "（文件为空）"}
            </pre>
          )}
        </section>

        <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-zinc-300">
              影片标题
            </h2>
            {titlePathDisplay ? (
              <code className="text-xs text-zinc-500">{titlePathDisplay}</code>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500">
            用于片头与 Cover（Remotion 读取{" "}
            <code className="rounded bg-zinc-900 px-1 text-zinc-400">
              public/video/title.json
            </code>
            ）。修改后请先<strong className="text-zinc-400">保存</strong>，再执行 TTS。
          </p>
          <input
            id="step2-video-title"
            type="text"
            value={videoTitle}
            onChange={(e) => {
              setS2((prev) => ({ ...prev, videoTitle: e.target.value }));
              setTitleFeedback(null);
            }}
            disabled={manuscriptLoading || running}
            placeholder="未设置时渲染可能沿用旧标题或默认文案"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2.5 text-sm text-zinc-100 outline-offset-2 placeholder:text-zinc-600 focus:outline focus:outline-2 focus:outline-app-cta/65 disabled:opacity-50"
            autoComplete="off"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveTitle}
              disabled={
                manuscriptLoading ||
                running ||
                titleSaving ||
                !titleDirty
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              {titleSaving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="size-3.5" aria-hidden />
              )}
              保存标题
            </button>
            {titleFeedback ? (
              <span
                className={
                  titleFeedback.includes("失败")
                    ? "text-xs text-amber-400"
                    : "text-xs text-zinc-500"
                }
              >
                {titleFeedback}
              </span>
            ) : null}
          </div>
        </section>

        <div className="space-y-2">
          <label
            htmlFor="step2-edge-voice"
            className="block text-sm font-medium text-zinc-300"
          >
            Edge / Azure TTS 音色（
            <code className="text-zinc-400">EDGE_TTS_VOICE</code>）
          </label>
          <select
            id="step2-edge-voice"
            value={edgeTtsVoice}
            onChange={(e) =>
              setS2((prev) => ({ ...prev, edgeTtsVoice: e.target.value }))
            }
            disabled={running}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2.5 text-sm text-zinc-100 outline-offset-2 focus:outline focus:outline-2 focus:outline-app-cta/65 disabled:opacity-50"
          >
            {voiceGroups.map((g) => (
              <optgroup key={g.lang} label={g.groupLabel}>
                {g.voices.map((v) => (
                  <option key={v.ttsValue} value={v.ttsValue}>
                    {formatAzureVoiceOptionLabel(v)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <audio
            ref={previewAudioRef}
            preload="none"
            className="hidden"
            onPlay={() => setPreviewPlaying(true)}
            onPause={() => setPreviewPlaying(false)}
            onEnded={() => setPreviewPlaying(false)}
            onError={() => {
              setPreviewPlaying(false);
              setPreviewHint(
                "无法加载试听音频。若尚未执行过 TTS，请先点击「执行 tts」。",
              );
            }}
          />
        </div>

        <p className="text-xs text-zinc-500">
          完成后请到<strong className="text-zinc-400"> 第三步 </strong>
          执行渲染（或将来自此页接入）。
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={run}
              disabled={
                running ||
                manuscriptLoading ||
                manuscript === null ||
                !!manuscriptError
              }
              className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-app-cta px-4 py-2.5 text-sm font-medium text-app-cta-foreground hover:bg-app-cta-hover disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  执行中
                </>
              ) : (
                "执行 tts"
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={playTtsPreview}
              disabled={running}
              title="播放 public/tts/audio.mp3（最近一次 TTS）"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              <Headphones className="size-4" aria-hidden />
              试听
            </button>
            <button
              type="button"
              onClick={stopTtsPreview}
              disabled={!previewPlaying}
              title="停止试听"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            >
              <StopCircle className="size-4" aria-hidden />
              停止
            </button>
            {previewHint ? (
              <span className="w-full text-right text-xs text-amber-400 sm:w-auto">
                {previewHint}
              </span>
            ) : null}
          </div>
        </div>

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
      <NextStepFab href="/scripts/step-3" />
    </div>
  );
}
