"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Square } from "lucide-react";
import { NextStepFab } from "../next-step-fab";
import { usePersistedJson } from "../use-persisted-json";
import { useRunScriptStreamLog } from "../use-run-script-stream-log";

type Step1Mode = "manual" | "zhihu" | "generic-web";

type LlmProviderId = "deepseek" | "kimi";

const LLM_OPTIONS: { id: LlmProviderId; label: string }[] = [
  { id: "deepseek", label: "DeepSeek" },
  { id: "kimi", label: "Kimi (Moonshot)" },
];

const STEP_OPTIONS: {
  id: Step1Mode;
  label: string;
}[] = [
    { id: "manual", label: "手工写稿 (无 LLM) " },
    { id: "zhihu", label: "知乎爬虫 + LLM" },
    { id: "generic-web", label: "通用网页爬虫 + LLM" },
  ];

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

function firstNonEmptyLine(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t.length > 0) return t;
  }
  return "";
}

function placeholderForMode(mode: Step1Mode): string {
  switch (mode) {
    case "manual":
      return "在此粘贴口播稿。每行一段，将保存到 output/spider/input.txt（覆盖已有文件）。";
    case "zhihu":
      return "知乎问题链接，例如：https://www.zhihu.com/question/316150890";
    case "generic-web":
      return "文章页完整 https:// 地址；将设置 SPIDER_SOURCE 并依次执行 spider:extract:url → caption:env。";
    default:
      return "";
  }
}

const STEP1_MODES = ["manual", "zhihu", "generic-web"] as const satisfies readonly Step1Mode[];

type Step1Persisted = {
  mode: Step1Mode;
  llmProvider: LlmProviderId;
  deepseekApiKey: string;
  moonshotApiKey: string;
  inputByMode: Record<Step1Mode, string>;
};

const STEP1_DEFAULT: Step1Persisted = {
  mode: "manual",
  llmProvider: "deepseek",
  deepseekApiKey: "",
  moonshotApiKey: "",
  inputByMode: {
    manual: "",
    zhihu: "",
    "generic-web": "",
  },
};

function normalizeStep1Persisted(raw: unknown, d: Step1Persisted): Step1Persisted {
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const mode = STEP1_MODES.includes(o.mode as Step1Mode)
    ? (o.mode as Step1Mode)
    : d.mode;
  const llmProvider: LlmProviderId =
    o.llmProvider === "deepseek" || o.llmProvider === "kimi"
      ? o.llmProvider
      : d.llmProvider;
  const deepseekApiKey =
    typeof o.deepseekApiKey === "string" ? o.deepseekApiKey : d.deepseekApiKey;
  const moonshotApiKey =
    typeof o.moonshotApiKey === "string" ? o.moonshotApiKey : d.moonshotApiKey;
  const inputByMode = { ...d.inputByMode };
  if (o.inputByMode && typeof o.inputByMode === "object") {
    const ibm = o.inputByMode as Record<string, unknown>;
    for (const m of STEP1_MODES) {
      const v = ibm[m];
      if (typeof v === "string") inputByMode[m] = v;
    }
  }
  if (typeof o.input === "string" && o.inputByMode === undefined) {
    inputByMode[mode] = o.input;
  }
  return { mode, llmProvider, deepseekApiKey, moonshotApiKey, inputByMode };
}

export default function ScriptsStep1Page() {
  const [step1, setStep1] = usePersistedJson(
    "step1",
    STEP1_DEFAULT,
    normalizeStep1Persisted,
  );
  const mode = step1.mode;
  const llmProvider = step1.llmProvider;
  const deepseekApiKey = step1.deepseekApiKey;
  const moonshotApiKey = step1.moonshotApiKey;
  const input = step1.inputByMode[step1.mode];
  const { log, setLog, appendStream, appendImmediate, flushPending } =
    useRunScriptStreamLog();
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLSpanElement>(null);

  const placeholder = useMemo(() => placeholderForMode(mode), [mode]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log]);

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  /** Extra env for spider / caption CLIs; merged before child runs. Root `.env` still loaded inside caption and overrides these keys if present there. */
  const captionLlmEnvForRun = useCallback((): Record<string, string> | undefined => {
    if (llmProvider === "deepseek") {
      const k = deepseekApiKey.trim();
      if (!k) return undefined;
      return { DEEPSEEK_API_KEY: k };
    }
    const env: Record<string, string> = { LLM_PROVIDER: "kimi" };
    const k = moonshotApiKey.trim();
    if (k) env.MOONSHOT_API_KEY = k;
    return env;
  }, [deepseekApiKey, moonshotApiKey, llmProvider]);

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
      let carry = "";
      let exitCode: number | null = null;
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
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    const stamp = new Date().toLocaleString();
    appendImmediate(`\n──────── ${stamp} · STEP1 · ${STEP_OPTIONS.find((o) => o.id === mode)?.label} ────────\n`);

    try {
      if (mode === "manual") {
        const res = await fetch("/api/dev/step1/write-input", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: input }),
          signal: ac.signal,
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          path?: string;
          error?: string;
        };
        if (!res.ok) {
          appendImmediate(`[write-input] ${json.error ?? res.status}\n`);
          return;
        }
        appendImmediate(
          `[write-input] 已写入 ${json.path ?? "output/spider/input.txt"}\n`,
        );
        return;
      }

      if (mode === "zhihu") {
        const url = firstNonEmptyLine(input);
        if (!url) {
          appendImmediate("[提示] 请填写知乎问题链接。\n");
          return;
        }
        if (!/^https?:\/\//i.test(url)) {
          appendImmediate("[提示] 链接应以 http:// 或 https:// 开头。\n");
          return;
        }
        await consumeRunScript(
          {
            script: "spider:zhihu",
            args: [url],
            env: captionLlmEnvForRun(),
          },
          ac.signal,
        );
        return;
      }

      if (mode === "generic-web") {
        const url = firstNonEmptyLine(input);
        if (!url) {
          appendImmediate("[提示] 请填写网页 URL。\n");
          return;
        }
        if (!/^https:\/\//i.test(url) && !/^http:\/\//i.test(url)) {
          appendImmediate("[提示] 请填写以 http:// 或 https:// 开头的完整 URL。\n");
          return;
        }
        appendImmediate("\n--- spider:extract:url (SPIDER_SOURCE) ---\n");
        const c1 = await consumeRunScript(
          {
            script: "spider:extract:url",
            env: { SPIDER_SOURCE: url },
          },
          ac.signal,
        );
        if (c1 !== 0) {
          appendImmediate("[提示] 上一步未成功，已跳过 caption:env。\n");
          return;
        }
        appendImmediate("\n--- caption:env ---\n");
        await consumeRunScript(
          { script: "caption:env", env: captionLlmEnvForRun() },
          ac.signal,
        );
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        appendImmediate("\n[已中止]\n");
      } else {
        appendImmediate(
          `\n[错误] ${e instanceof Error ? e.message : String(e)}\n`,
        );
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [
    appendImmediate,
    consumeRunScript,
    captionLlmEnvForRun,
    input,
    mode,
    running,
  ]);

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
          STEP1：文稿准备与整理
        </p>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 pb-24 sm:px-6 sm:pb-20">
        <div className="space-y-2">
          <label
            htmlFor="step1-mode"
            className="block text-sm font-medium text-zinc-300"
          >
            做法（三选一）
          </label>
          <select
            id="step1-mode"
            value={mode}
            onChange={(e) =>
              setStep1((s) => ({ ...s, mode: e.target.value as Step1Mode }))
            }
            disabled={running}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2.5 text-sm text-zinc-100 outline-offset-2 focus:outline focus:outline-2 focus:outline-app-cta/65"
          >
            {STEP_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="step1-llm"
            className="block text-sm font-medium text-zinc-300"
          >
            LLM（文稿整理）
          </label>
          <select
            id="step1-llm"
            value={llmProvider}
            onChange={(e) =>
              setStep1((s) => ({
                ...s,
                llmProvider: e.target.value as LlmProviderId,
              }))
            }
            disabled={running}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2.5 text-sm text-zinc-100 outline-offset-2 focus:outline focus:outline-2 focus:outline-app-cta/65"
          >
            {LLM_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            与口播链路一致：可在下方填入密钥并注入子进程；仓库根{" "}
            <code className="rounded bg-zinc-900 px-1 text-zinc-400">.env</code>{" "}
            中的同名变量会在 caption 进程内再次加载并覆盖（与 CLI 行为一致）。选 Kimi
            时运行会带上{" "}
            <code className="rounded bg-zinc-900 px-1 text-zinc-400">
              LLM_PROVIDER=kimi
            </code>
            。
          </p>
        </div>

        {llmProvider === "deepseek" && (
          <div className="space-y-2">
            <label
              htmlFor="step1-deepseek-key"
              className="block text-sm font-medium text-zinc-300"
            >
              DeepSeek API Key
            </label>
            <input
              id="step1-deepseek-key"
              type="password"
              autoComplete="off"
              value={deepseekApiKey}
              onChange={(e) =>
                setStep1((s) => ({ ...s, deepseekApiKey: e.target.value }))
              }
              disabled={running}
              placeholder="可选：留空则使用 .env 中的 DEEPSEEK_API_KEY"
              className="w-full rounded-xl border border-zinc-700 bg-black/60 px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 outline-offset-2 focus:outline focus:outline-2 focus:outline-app-cta/55 disabled:opacity-50"
            />
          </div>
        )}

        {llmProvider === "kimi" && (
          <div className="space-y-2">
            <label
              htmlFor="step1-moonshot-key"
              className="block text-sm font-medium text-zinc-300"
            >
              Moonshot API Key（Kimi）
            </label>
            <input
              id="step1-moonshot-key"
              type="password"
              autoComplete="off"
              value={moonshotApiKey}
              onChange={(e) =>
                setStep1((s) => ({ ...s, moonshotApiKey: e.target.value }))
              }
              disabled={running}
              placeholder="可选：留空则使用 .env 中的 MOONSHOT_API_KEY 或 KIMI_API_KEY"
              className="w-full rounded-xl border border-zinc-700 bg-black/60 px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 outline-offset-2 focus:outline focus:outline-2 focus:outline-app-cta/55 disabled:opacity-50"
            />
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="step1-input"
            className="block text-sm font-medium text-zinc-300"
          >
            输入
          </label>
          <textarea
            id="step1-input"
            value={input}
            onChange={(e) =>
              setStep1((s) => ({
                ...s,
                inputByMode: {
                  ...s.inputByMode,
                  [s.mode]: e.target.value,
                },
              }))
            }
            disabled={running}
            placeholder={placeholder}
            rows={mode === "manual" ? 10 : 4}
            className="w-full resize-y rounded-xl border border-zinc-700 bg-black/60 px-3 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 outline-offset-2 focus:outline focus:outline-2 focus:outline-app-cta/55 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-app-cta px-4 py-2.5 text-sm font-medium text-app-cta-foreground hover:bg-app-cta-hover disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                执行中
              </>
            ) : (
              "执行"
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
      <NextStepFab href="/scripts/step-2" />
    </div>
  );
}
