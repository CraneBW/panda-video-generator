import Link from "next/link";
import { Compass, Terminal, Github } from "lucide-react";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(34,211,238,0.08),transparent_50%),radial-gradient(ellipse_70%_60%_at_0%_80%,rgba(192,132,252,0.07),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black_15%,transparent_70%)]"
        aria-hidden
      />

      {/* Terminal-style header */}
      <header className="border-b border-white/[0.06] bg-zinc-950/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <span className="text-emerald-400 font-mono text-sm">❯</span>
          <span className="font-mono text-sm tracking-tight text-zinc-300">
            PandaVideoAutomations
          </span>
          <span className="hidden h-5 w-2 animate-pulse bg-zinc-400 sm:inline-block" />
        </div>
      </header>

      {/* Main content — fill remaining viewport */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Page title */}
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl md:text-4xl">
            <span className="text-amber-400">Panda</span>
            <span className="text-zinc-300">Video</span>
            <span className="text-zinc-500">Automations</span>
          </h1>
          <p className="mt-2 font-mono text-sm text-zinc-600 sm:text-base">
            熊猫视频自动化引擎
          </p>
        </div>

        {/* Cards fill most of the available height */}
        <div className="flex w-full max-w-5xl flex-1 flex-col gap-4 sm:flex-row sm:gap-6">
          {/* PandaVideoGenerator card */}
          <div className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-amber-900/40 bg-gradient-to-b from-[#1a1710] to-[#0f0e0b] shadow-[0_0_0_1px_rgba(251,191,36,0.06)_inset] transition-all duration-500 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-amber-400/30 before:to-transparent hover:border-amber-500/40 hover:shadow-[0_32px_100px_-24px_rgba(251,191,36,0.25)] sm:p-12 motion-reduce:transform-none motion-reduce:hover:transform-none">
            <Link href="/landing" className="flex flex-1 flex-col items-center p-8 sm:p-0">
              {/* Decorative terminal lines */}
              <div className="absolute left-4 top-3 font-mono text-[0.6rem] text-zinc-700/50 sm:left-6 sm:top-4">
                {">"} cd ~/panda-video-generator
              </div>

              <div className="mb-5 inline-flex size-16 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300/90 ring-1 ring-amber-500/20 sm:size-20">
                <Compass className="size-8 sm:size-10" strokeWidth={1.5} />
              </div>

              <h2 className="mb-1 font-mono text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl md:text-3xl">
                <span className="text-amber-400">Panda</span>
                <span className="text-zinc-300">Video</span>
                <span className="text-zinc-500">Generator</span>
              </h2>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[0.65rem] text-zinc-600 sm:text-xs">
                <span className="rounded bg-zinc-900 px-2 py-0.5">#web-ui</span>
                <span className="rounded bg-zinc-900 px-2 py-0.5">#wizard</span>
                <span className="rounded bg-zinc-900 px-2 py-0.5">#自动化向导</span>
              </div>

              <p className="mt-4 max-w-xs text-center font-mono text-xs leading-relaxed text-zinc-500 sm:text-sm">
                最简单的使用方式：可视化开启，按步骤完成内容提取 → 配音 → 字幕 → 发布
              </p>

              <span className="mt-6 font-mono text-xs text-amber-600/70">
                $ pnpm automation
              </span>
              <span className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 font-mono text-xs font-semibold text-zinc-300 transition-all group-hover:bg-white/[0.12] group-hover:text-white">
                点击查看 →
              </span>
            </Link>
            <a
              href="https://github.com/szhshp/panda-video-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-8 mb-8 mt-3 flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 font-mono text-xs font-semibold text-zinc-300 transition-all hover:bg-white/[0.12] hover:text-white sm:mx-0 sm:mb-0 sm:mt-3"
            >
              <Github size={15} />
              szhshp/panda-video-generator
            </a>
          </div>

          {/* publisher-cli card */}
          <div className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-[#0f1a12] to-[#0b0f0c] shadow-[0_0_0_1px_rgba(16,185,129,0.06)_inset] transition-all duration-500 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-emerald-400/30 before:to-transparent hover:border-emerald-500/40 hover:shadow-[0_32px_100px_-24px_rgba(16,185,129,0.25)] sm:p-12 motion-reduce:transform-none motion-reduce:hover:transform-none">
            <Link href="/cli" className="flex flex-1 flex-col items-center p-8 sm:p-0">
              {/* Decorative terminal lines */}
              <div className="absolute left-4 top-3 font-mono text-[0.6rem] text-zinc-700/50 sm:left-6 sm:top-4">
                {"$"} pva --help
              </div>

              <div className="mb-5 inline-flex size-16 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300/90 ring-1 ring-emerald-500/20 sm:size-20">
                <Terminal className="size-8 sm:size-10" strokeWidth={1.5} />
              </div>

              <h2 className="mb-1 font-mono text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl md:text-3xl">
                <span className="text-emerald-400">Publisher</span>
                <span className="text-zinc-500">-CLI</span>
              </h2>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[0.65rem] text-zinc-600 sm:text-xs">
                <span className="rounded bg-zinc-900 px-2 py-0.5">#headless</span>
                <span className="rounded bg-zinc-900 px-2 py-0.5">#ci-ready</span>
                <span className="rounded bg-zinc-900 px-2 py-0.5">#pva-cli</span>
              </div>

              <p className="mt-4 max-w-xs text-center font-mono text-xs leading-relaxed text-zinc-500 sm:text-sm">
                可编程流水线：无缝集成 CI/CD、cron 定时任务与自有自动化工具
              </p>

              <span className="mt-6 font-mono text-xs text-emerald-600/70">
                $ pva bilibili upload --video ./demo.mp4 --title "..."
              </span>
              <span className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 font-mono text-xs font-semibold text-zinc-300 transition-all group-hover:bg-white/[0.12] group-hover:text-white">
                点击查看 →
              </span>
            </Link>
            <a
              href="https://github.com/szhshp/panda-video-automations-publisher"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-8 mb-8 mt-3 flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 font-mono text-xs font-semibold text-zinc-300 transition-all hover:bg-white/[0.12] hover:text-white sm:mx-0 sm:mb-0 sm:mt-3"
            >
              <Github size={15} />
              szhshp/panda-video-automations-publisher
            </a>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
