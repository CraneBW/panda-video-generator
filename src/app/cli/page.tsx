import Link from "next/link";
import {
  ArrowLeft,
  Terminal,
  LogIn,
  Upload,
  Globe,
  Shield,
  BookOpen,
  Newspaper,
} from "lucide-react";

export default function CliPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(34,211,238,0.08),transparent_50%),radial-gradient(ellipse_70%_60%_at_0%_80%,rgba(192,132,252,0.07),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_35%,black_15%,transparent_70%)]"
        aria-hidden
      />

      <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft size={16} />
          返回首页
        </Link>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 text-emerald-200/90 shadow-inner ring-1 ring-white/10">
            <Terminal className="size-7" strokeWidth={1.75} />
          </div>

          <h1 className="font-mono text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl md:text-4xl">
            Panda Video Automation Publisher
          </h1>
          <p className="mt-2 font-mono text-base text-emerald-400">
            One CLI to publish everywhere.
          </p>
          <p className="mt-4 text-lg text-zinc-400">
            跨平台视频上传自动化引擎，支持 Bilibili、抖音、快手、微信视频号、YouTube。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="https://github.com/szhshp/panda-video-automations-publisher"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-5 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-600/20 transition-colors"
            >
              查看 GitHub 仓库
            </Link>
            <Link
              href="https://www.npmjs.com/package/@panda-video-automation/pva"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-red-600/40 bg-red-600/10 px-5 py-2.5 text-sm font-medium text-red-300 hover:bg-red-600/20 transition-colors"
            >
              查看 npm 包
            </Link>
          </div>

          {/* Standalone CLI notice */}
          <section className="mt-12 rounded-2xl border border-amber-600/30 bg-gradient-to-b from-amber-900/20 to-zinc-950/95 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
              <Newspaper size={20} className="text-amber-400" />
              独立 CLI 工具
            </h2>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              本 CLI 是 <strong className="text-zinc-200">独立发布的 npm 包</strong>，可在任意项目中单独使用，无需依赖 Panda Video Generator 主项目。
            </p>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              在完整的视频生产流水线中，典型的工作流为：
            </p>
            <div className="mt-4 rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-300 border border-white/[0.05]">
              网页抓取 → LLM 文稿优化 → Edge TTS + 字幕 → Remotion 渲染 → <span className="text-emerald-400">pva 发布</span>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              渲染完成后，直接调用 <code className="text-emerald-400">pva</code> 将成片分发到各平台。亦可单独用于已有视频的手动上传。
            </p>
          </section>

          {/* Quick Install */}
          <section className="mt-12 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
              <Terminal size={20} className="text-emerald-400" />
              快速开始
            </h2>
            <div className="mt-4 rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-300 border border-white/[0.05]">
              <p className="text-zinc-500"># 全局安装</p>
              <p className="text-zinc-100">npm install -g @panda-video-automation/pva</p>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              环境要求：Node.js &ge; 20.9.0，安装后 <code className="text-emerald-400">pva</code> 命令即可全局使用。
            </p>
          </section>

          {/* Login */}
          <section className="mt-8 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
              <LogIn size={20} className="text-emerald-400" />
              1. 登录（每个平台只需一次）
            </h2>
            <div className="mt-4 rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-300 border border-white/[0.05]">
              <p className="text-zinc-100">pva bilibili login</p>
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              打开浏览器，手动完成登录后自动检测并持久化 Session。
              后续上传无需重复登录。Session 有效期因平台而异，微信视频号需要每日重新登录。
            </p>
          </section>

          {/* Upload */}
          <section className="mt-8 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
              <Upload size={20} className="text-emerald-400" />
              2. 上传视频
            </h2>
            <div className="mt-4 rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-300 border border-white/[0.05]">
              <p className="text-zinc-500"># CLI 参数上传</p>
              <p className="text-zinc-100">pva bilibili upload \</p>
              <p className="text-zinc-100">&nbsp;&nbsp;--video ./video.mp4 \</p>
              <p className="text-zinc-100">&nbsp;&nbsp;--title "My Title" \</p>
              <p className="text-zinc-100">&nbsp;&nbsp;--desc "Description" \</p>
              <p className="text-zinc-100">&nbsp;&nbsp;--tags tag1,tag2</p>
            </div>
            <div className="mt-4 rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-300 border border-white/[0.05]">
              <p className="text-zinc-500"># 环境变量上传</p>
              <p className="text-zinc-500">export</p>
              <p className="text-zinc-500">VIDEO_PATH=./video.mp4</p>
              <p className="text-zinc-500">export VIDEO_TITLE=&quot;My Video&quot;</p>
              <p className="text-zinc-100">pva youtube upload</p>
            </div>
            <div className="mt-4 rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-300 border border-white/[0.05]">
              <p className="text-zinc-500"># 批量发布</p>
              <p className="text-zinc-100">pva bilibili upload &amp;&amp; pva douyin upload &amp;&amp; pva kuaishou upload</p>
            </div>
          </section>

          {/* CLI Reference */}
          <section className="mt-8 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
              <BookOpen size={20} className="text-emerald-400" />
              CLI 参考
            </h2>
            <p className="mt-3 font-mono text-sm text-zinc-400">
              pva &lt;platform&gt; &lt;action&gt; [options]
            </p>

            <h3 className="mt-6 font-semibold text-zinc-300">平台列表</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-zinc-500">
                    <th className="py-2 pr-4 text-left font-medium">平台</th>
                    <th className="py-2 pr-4 text-left font-medium">标识符</th>
                    <th className="py-2 text-left font-medium">别名</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {[
                    ["Bilibili", "bilibili", ""],
                    ["抖音", "douyin", ""],
                    ["快手", "kuaishou", ""],
                    ["微信视频号", "weixin", "weixinvideo、wechat"],
                    ["YouTube", "youtube", "yt"],
                  ].map(([platform, id, alias]) => (
                    <tr key={id} className="border-b border-white/[0.04]">
                      <td className="py-2 pr-4">{platform}</td>
                      <td className="py-2 pr-4 font-mono text-emerald-400">{id}</td>
                      <td className="py-2 font-mono text-zinc-500">{alias || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 font-semibold text-zinc-300">操作</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-zinc-500">
                    <th className="py-2 pr-4 text-left font-medium">操作</th>
                    <th className="py-2 text-left font-medium">说明</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">login</td>
                    <td className="py-2">登录并保存浏览器 Session</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">upload</td>
                    <td className="py-2">上传视频及元数据</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-6 font-semibold text-zinc-300">上传参数</h3>
            <p className="mt-1 text-xs text-zinc-500">参数可通过 CLI 标志或环境变量传入。</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-zinc-500">
                    <th className="py-2 pr-4 text-left font-medium">参数</th>
                    <th className="py-2 pr-4 text-left font-medium">环境变量</th>
                    <th className="py-2 text-left font-medium">说明</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">--video</td>
                    <td className="py-2 pr-4 font-mono text-zinc-500">VIDEO_PATH</td>
                    <td className="py-2">视频文件路径（必填）</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">--title</td>
                    <td className="py-2 pr-4 font-mono text-zinc-500">VIDEO_TITLE</td>
                    <td className="py-2">视频标题（必填）</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">--desc</td>
                    <td className="py-2 pr-4 font-mono text-zinc-500">VIDEO_DESC</td>
                    <td className="py-2">视频描述</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">--tags</td>
                    <td className="py-2 pr-4 font-mono text-zinc-500">VIDEO_TAGS</td>
                    <td className="py-2">逗号分隔的标签</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">--cover</td>
                    <td className="py-2 pr-4 font-mono text-zinc-500">VIDEO_COVER</td>
                    <td className="py-2">封面图片路径</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">--privacy</td>
                    <td className="py-2 pr-4 font-mono text-zinc-500">VIDEO_PRIVACY</td>
                    <td className="py-2">YouTube：public / unlisted（默认）/ private</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-4 font-mono">--headless</td>
                    <td className="py-2 pr-4 font-mono text-zinc-500">PVA_HEADLESS</td>
                    <td className="py-2">无头模式运行（默认有头）</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Platform Limits */}
          <section className="mt-8 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
              <Globe size={20} className="text-emerald-400" />
              平台限制
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-zinc-500">
                    <th className="py-2 pr-3 text-left font-medium">平台</th>
                    <th className="py-2 pr-3 text-left font-medium">标题长度</th>
                    <th className="py-2 pr-3 text-left font-medium">描述字段</th>
                    <th className="py-2 text-left font-medium">注意事项</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3">抖音</td>
                    <td className="py-2 pr-3">30 字</td>
                    <td className="py-2 pr-3">支持</td>
                    <td className="py-2">发布前需勾选"内容为个人观点或见解"</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3">快手</td>
                    <td className="py-2 pr-3">标题+描述合并</td>
                    <td className="py-2 pr-3">合并到标题</td>
                    <td className="py-2">使用 contenteditable 单一字段</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3">Bilibili</td>
                    <td className="py-2 pr-3">无严格限制</td>
                    <td className="py-2 pr-3">支持</td>
                    <td className="py-2">支持 AI 生成内容标注</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3">微信视频号</td>
                    <td className="py-2 pr-3">无严格限制</td>
                    <td className="py-2 pr-3">支持</td>
                    <td className="py-2">使用"昨日数据"文本判断登录状态</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3">YouTube</td>
                    <td className="py-2 pr-3">无严格限制</td>
                    <td className="py-2 pr-3">支持</td>
                    <td className="py-2">支持隐私级别</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Architecture */}
          <section className="mt-8 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/80 to-zinc-950/95 p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
              <Shield size={20} className="text-emerald-400" />
              实现原理
            </h2>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              基于 Playwright Test 的浏览器自动化框架：
            </p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-zinc-400 leading-relaxed">
              <li>
                <strong className="text-zinc-300">登录流程</strong>
                — 打开目标平台的创作者后台，等待用户手动登录，检测到成功状态后保存浏览器 Storage State 到
                <code className="mx-1 text-emerald-400">playwright/.auth/</code>
              </li>
              <li>
                <strong className="text-zinc-300">上传流程</strong>
                — 恢复已保存的 Session，导航到上传页面，自动定位表单控件并填充视频元数据，提交发布
              </li>
              <li>
                Spec 文件位于 <code className="mx-1 text-emerald-400">automations/</code> 目录，按平台分目录组织
              </li>
              <li>
                TypeScript 源码编译为 JS 后发布到 npm，产物在 <code className="mx-1 text-emerald-400">dist/</code> 目录
              </li>
            </ol>
          </section>

        </div>
      </div>
    </div>
  );
}
