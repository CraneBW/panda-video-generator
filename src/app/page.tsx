"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  ExternalLink,
  Github,
  Globe,
  Video,
  Upload,
} from "lucide-react";
import { defaultMyCompProps } from "../../types/constants";

// Media files in /public/media directory
const mediaFiles = [
  { id: "douyin", path: "/media/douyin.webp", label: "抖音 · 熊猫智研社" },
  { id: "weichat", path: "/media/weichat.webp", label: "微信视频号 · 熊猫智研社" },
  { id: "kuaishou", path: "/media/kuaishou.webp", label: "快手 · 熊猫智研社" },
  { id: "rednote", path: "/media/rednote.webp", label: "小红书 · 熊猫智研社" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-black text-zinc-100">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/logo/logo.png"
              alt="Panda Video Generator Logo"
              width={40}
              height={40}
              className="rounded-lg w-8 h-8 sm:w-10 sm:h-10"
            />
            <span className="text-base sm:text-xl font-bold text-zinc-50 truncate max-w-[140px] sm:max-w-none">
              {defaultMyCompProps.title}
            </span>
          </div>
          <Link
            href="https://github.com/szhshp/panda-video-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-zinc-600 bg-zinc-900/80 text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors text-sm sm:text-base"
          >
            <Github size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 text-center">
        <div className="flex justify-center mb-6 sm:mb-8">
          <Image
            src="/logo/logo.png"
            alt="Panda Video Generator Logo"
            width={200}
            height={200}
            className="rounded-2xl shadow-lg shadow-black/40 ring-1 ring-zinc-800 w-32 h-32 sm:w-48 sm:h-48 md:w-52 md:h-52"
          />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-50 mb-3 sm:mb-4 px-2">
          Panda Video Generator
        </h1>
        <p className="text-lg sm:text-xl text-zinc-300 mb-2 px-2">
          熊猫视频自动化引擎
        </p>
        <p className="text-base sm:text-lg text-zinc-400 italic mb-4 sm:mb-5 px-2">
          &ldquo;Developer-first video automation.&rdquo;
        </p>
        <p className="text-sm sm:text-base md:text-lg text-zinc-400 max-w-3xl mx-auto mb-6 sm:mb-8 px-2 leading-relaxed">
          Panda Video Generator
          是全自动化视频内容生成与发布平台，支持从网页内容提取、文本转视频到多平台发布的完整工作流。通过
          AI 驱动的文本转语音（TTS）与视频渲染引擎帮助快速生成高质量视频；发布侧通过 Playwright
          驱动浏览器完成上传，各平台共用相近自动化流程。
        </p>
        <div className="flex gap-3 sm:gap-4 justify-center flex-wrap px-2">
          <Link
            href="https://github.com/szhshp/panda-video-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border border-zinc-600 bg-zinc-900/80 text-zinc-100 rounded-lg hover:bg-zinc-800 transition-colors text-sm sm:text-base"
          >
            <Github size={18} className="sm:w-5 sm:h-5" />
            <span>View on GitHub</span>
          </Link>
          <Link
            href="https://github.com/szhshp/panda-video-generator#quick-start"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-red-400 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            开始使用
          </Link>
        </div>
      </section>

      {/* Features — distinct product cards (not pipeline / mono spec style) */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-zinc-50 px-2">
          核心特性
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-zinc-500 leading-relaxed">
          抓取与成片、多平台发布既可单独使用，也可接成端到端自动化流水线。
        </p>
        <div className="mt-10 grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/55 to-zinc-950/90 p-6 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 hover:ring-zinc-500/20 sm:p-7">
            <span
              className="pointer-events-none absolute -right-1 -top-6 text-[5.5rem] font-black leading-none tabular-nums text-white/[0.035] transition-colors duration-300 group-hover:text-white/[0.055] sm:text-[6.25rem]"
              aria-hidden
            >
              1
            </span>
            <div
              className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400 ring-1 ring-zinc-700/80"
              aria-hidden
            >
              <Globe className="size-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
              <span className="text-yellow-400 font-bold">一键</span>
              网页转文本
            </h3>
            <p className="mt-3 grow text-sm leading-relaxed text-zinc-400">
              一键抓取正文与标题（如知乎），输出结构化文件，减少手工整理；也可按需扩展更多站点解析能力。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                网页提取
              </span>
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                结构化输出
              </span>
            </div>
          </article>

          <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/55 to-zinc-950/90 p-6 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 hover:ring-zinc-500/20 sm:p-7">
            <span
              className="pointer-events-none absolute -right-1 -top-6 text-[5.5rem] font-black leading-none tabular-nums text-white/[0.035] transition-colors duration-300 group-hover:text-white/[0.055] sm:text-[6.25rem]"
              aria-hidden
            >
              2
            </span>
            <div
              className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400 ring-1 ring-zinc-700/80"
              aria-hidden
            >
              <Video className="size-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
              <span className="text-yellow-400 font-bold">一键</span>
              文本转视频
            </h3>
            <p className="mt-3 grow text-sm leading-relaxed text-zinc-400">
              一键跑通口播链路：Edge TTS 生成配音与 VTT 字幕，由 Remotion
              模板渲染成片；当前以横屏模板为主，更多版式持续迭代中。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                Edge TTS
              </span>
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                Remotion
              </span>
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                字幕 VTT
              </span>
            </div>
          </article>

          <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/55 to-zinc-950/90 p-6 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 hover:ring-zinc-500/20 sm:p-7">
            <span
              className="pointer-events-none absolute -right-1 -top-6 text-[5.5rem] font-black leading-none tabular-nums text-white/[0.035] transition-colors duration-300 group-hover:text-white/[0.055] sm:text-[6.25rem]"
              aria-hidden
            >
              3
            </span>
            <div
              className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400 ring-1 ring-zinc-700/80"
              aria-hidden
            >
              <Upload className="size-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
              <span className="text-yellow-400 font-bold">一键</span>
              多平台发布
            </h3>
            <p className="mt-3 grow text-sm leading-relaxed text-zinc-400">
              一键驱动 Playwright 在浏览器中完成上传；B
              站、抖音、视频号、YouTube、小红书、快手等平台流程相近，各平台使用独立上传脚本，可按需分别启用。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                Playwright
              </span>
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                网页端上传
              </span>
            </div>
          </article>

          <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/55 to-zinc-950/90 p-6 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 hover:ring-zinc-500/20 sm:p-7">
            <span
              className="pointer-events-none absolute -right-1 -top-6 text-[5.5rem] font-black leading-none tabular-nums text-white/[0.035] transition-colors duration-300 group-hover:text-white/[0.055] sm:text-[6.25rem]"
              aria-hidden
            >
              4
            </span>
            <div
              className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-zinc-800/80 text-zinc-400 ring-1 ring-zinc-700/80"
              aria-hidden
            >
              <Compass className="size-5" strokeWidth={1.75} />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">
              <span className="text-yellow-400 font-bold">傻瓜式</span>
              自动化向导
            </h3>
            <p className="mt-3 grow text-sm leading-relaxed text-zinc-400">
              通过浏览器向导用点击完成文稿、TTS、成片渲染与可选发布；项目根目录执行{" "}
              <code className="rounded bg-zinc-800/90 px-1.5 py-0.5 text-xs text-zinc-300">
                pnpm automation
              </code>{" "}
              将自动打开向导界面，亦可在本站点直接进入步骤页。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                全流程
              </span>
              <span className="rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-medium text-zinc-400">
                无需记命令
              </span>
            </div>
          </article>
        </div>
      </section>

      {/* Finished work showcase */}
      <section className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-zinc-50 px-2">
          成品展示
        </h2>
        <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-lg shadow-black/40 border border-zinc-800 bg-black">
          <iframe
            title="Panda Video Generator 成品展示"
            src="https://player.bilibili.com/player.html?isOutside=true&aid=116245168922269&bvid=BV19Rw9zwEd4&cid=36772710081&p=1&autoplay=0"
            className="absolute inset-0 w-full h-full border-0"
            scrolling="no"
            allowFullScreen
          />
        </div>
      </section>

      {/* Demo video */}
      <section className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-zinc-50 px-2">
          技术演示
        </h2>
        <div className="relative w-full max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-lg shadow-black/40 border border-zinc-800 bg-black">
          <iframe
            title="Panda Video Generator 演示视频"
            src="https://player.bilibili.com/player.html?isOutside=true&aid=116312193900291&bvid=BV1v5XXBMEz9&cid=37073193133&p=1&autoplay=0"
            className="absolute inset-0 w-full h-full border-0"
            scrolling="no"
            allowFullScreen
          />
        </div>
      </section>

      {/* Platform Screenshots */}
      <section className="container mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div
          className="mb-6 h-px w-full bg-zinc-700 sm:mb-8"
          aria-hidden
        />
        <header className="mx-auto mb-8 max-w-2xl px-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            平台示例
          </h2>
          {/* <p className="mt-3 max-w-md mx-auto text-sm text-zinc-500">
            网页端截取，展示以各平台当时界面为准。
          </p> */}
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {mediaFiles.map((file) => (
            <div
              key={file.id}
              className="bg-zinc-900/70 rounded-xl shadow-lg shadow-black/30 overflow-hidden border border-zinc-800"
            >
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/60 px-3 py-1.5">
                <span className="max-w-[52%] truncate font-mono text-[9px] text-zinc-600 sm:text-[10px]">
                  {file.id}
                </span>
              </div>
              <div className="relative w-full h-[280px] sm:h-[320px] overflow-hidden bg-zinc-950">
                <Image
                  src={file.path}
                  alt={file.label}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-contain p-2"
                />
              </div>
              <div className="border-t border-zinc-800/80 bg-zinc-950/40 px-3 py-3 text-center sm:px-4 sm:py-4">
                <p className="text-sm font-medium text-zinc-100">{file.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Section */}
      {/* <section className="container mx-auto px-4 py-16 bg-gray-50 rounded-2xl">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          技术栈
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[
            { name: "Next.js 16", color: "bg-black" },
            { name: "React 19", color: "bg-blue-500" },
            { name: "Remotion 4.0", color: "bg-red-600" },
            { name: "TypeScript 5.9", color: "bg-blue-600" },
            { name: "Edge TTS", color: "bg-green-500" },
            { name: "Playwright", color: "bg-green-600" },
          ].map((tech) => (
            <div
              key={tech.name}
              className="bg-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-shadow"
            >
              <div className={`${tech.color} h-2 w-full rounded mb-2`}></div>
              <p className="text-sm font-medium text-gray-700">{tech.name}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 mt-8 sm:mt-16 border-t border-zinc-800">
        <div className="text-center text-zinc-400 text-sm sm:text-base space-y-4">
          <p>Made with ❤️ by szhshp x 熊猫智研社</p>
          <div className="flex justify-center gap-6 sm:gap-8 flex-wrap items-center">
            <a
              href="https://github.com/szhshp/panda-video-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-zinc-50 underline-offset-4 hover:underline"
            >
              <Github size={18} className="shrink-0" aria-hidden />
              <span>GitHub 仓库</span>
            </a>
            <a
              href="https://szhshp.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-zinc-50 underline-offset-4 hover:underline"
            >
              <ExternalLink size={16} className="shrink-0" aria-hidden />
              <span>开发者博客</span>
            </a>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500">
            © {new Date().getFullYear()} Panda Video Generator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
