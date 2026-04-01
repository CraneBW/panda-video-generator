import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Globe, Headphones, Upload, Video } from "lucide-react";

const STEPS: readonly {
  href: string;
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tags: readonly string[];
}[] = [
    {
      href: "/scripts/step-1",
      number: "1",
      title: "第一步",
      description: "文稿准备与整理",
      icon: Globe,
      tags: ["文稿", "网页提取", "整理与优化"],
    },
    {
      href: "/scripts/step-2",
      number: "2",
      title: "第二步",
      description: "仅 TTS：配音与字幕",
      icon: Headphones,
      tags: ["TTS", "配音与字幕"],
    },
    {
      href: "/scripts/step-3",
      number: "3",
      title: "第三步",
      description: "根据模板渲染视频",
      icon: Video,
      tags: ["视频素材", "渲染与合成"],
    },
    {
      href: "/scripts/step-4",
      number: "4",
      title: "第四步",
      description: "各平台登录与上传",
      icon: Upload,
      tags: ["多平台发布", "自动化上传"],
    },
  ];

export default function ScriptsHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-black text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50">
              自动化向导
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 sm:py-16">
        <h2 className="px-2 text-center text-2xl font-bold text-zinc-50 sm:text-3xl">
          分步向导
        </h2>
        <p className="mx-auto mt-3 max-w-lg px-2 text-center text-sm leading-relaxed text-zinc-500">
          从第一步依次做到第四步即可；点卡片进入对应页面。
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.href}>
                <Link
                  href={step.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/55 to-zinc-950/90 p-6 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 hover:ring-zinc-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50 sm:p-7"
                >
                  <span
                    className="pointer-events-none absolute -right-1 -top-6 text-[5.5rem] font-black leading-none tabular-nums text-white/[0.035] transition-colors duration-300 group-hover:text-white/[0.055] sm:text-[6.25rem]"
                    aria-hidden
                  >
                    {step.number}
                  </span>
                  <div
                    className="relative mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400 ring-1 ring-zinc-700/80"
                    aria-hidden
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="relative text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="relative mt-3 grow text-sm leading-relaxed text-zinc-400">
                    {step.description}
                  </p>
                  <div className="relative mt-6 flex flex-wrap gap-2">
                    {step.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="relative mt-4 text-xs font-medium text-zinc-500 transition-colors group-hover:text-yellow-400/90">
                    进入 →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
