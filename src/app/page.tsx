"use client";

import Image from "next/image";
import Link from "next/link";
import { Github, Zap, Globe, Video, Upload } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/logo.png"
              alt="Panda Video Generator Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-gray-900">
              Panda Video Generator
            </span>
          </div>
          <Link
            href="https://github.com/szhshp/panda-video-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Github size={20} />
            <span>GitHub</span>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo/logo.png"
            alt="Panda Video Generator Logo"
            width={200}
            height={200}
            className="rounded-2xl shadow-lg"
          />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Panda Video Generator
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          熊猫视频自动化引擎
        </p>
        <p className="text-lg text-gray-500 max-w-3xl mx-auto mb-8">
          Panda Video Generator 是一个全自动化的视频内容生成与发布平台，支持从网页内容提取、文本转视频到多平台发布的完整工作流。通过 AI 驱动的文本转语音（TTS）技术和 Remotion 视频渲染引擎，帮助内容创作者快速生成高质量视频并一键发布到多个平台。
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="https://github.com/szhshp/panda-video-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Github size={20} />
            <span>View on GitHub</span>
          </Link>
          {/* <Link
            href="/scripts"
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            开始使用
          </Link> */}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          核心特性
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="text-red-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900">
                <span className="text-red-600 font-bold text-2xl">一键</span>
                网页转文本
              </h3>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <Zap className="text-red-600 mt-1" size={16} />
                <span>
                  <span className="text-red-600 font-bold">一键</span>提取：只需一个命令，自动识别并提取网页核心内容
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>多平台支持：支持知乎、Bilibili 等主流平台</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>结构化输出：自动生成标题和正文文本文件，无需手动处理</span>
              </li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Video className="text-red-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900">
                <span className="text-red-600 font-bold text-2xl">一键</span>
                文本转视频
              </h3>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <Zap className="text-red-600 mt-1" size={16} />
                <span>
                  <span className="text-red-600 font-bold">一键</span>生成：从文本到视频，全程自动化，无需人工干预
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>AI 语音合成：基于 Edge TTS 的高质量语音生成</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>自动字幕生成：同步生成 VTT 字幕文件</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>专业视频模板：使用 Remotion 构建的可定制视频模板</span>
              </li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="text-red-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900">
                <span className="text-red-600 font-bold text-2xl">一键</span>
                多平台统一发布
              </h3>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <Zap className="text-red-600 mt-1" size={16} />
                <span>
                  <span className="text-red-600 font-bold">一键</span>发布：一次命令，同时发布到多个平台
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>统一发布接口：一次配置，多平台同步</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>自动化上传：基于 Playwright 的浏览器自动化</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="text-gray-400 mt-1" size={16} />
                <span>平台支持：Bilibili、抖音、微信视频号等</span>
              </li>
            </ul>
          </div>
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
      <footer className="container mx-auto px-4 py-12 mt-16 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p className="mb-2">
            Made with <span className="text-red-600">❤️</span> by 熊猫智研社
          </p>
          <p className="text-sm">
            © 2024 Panda Video Generator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
