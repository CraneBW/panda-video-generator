<div align="center">
  <img src="./public/logo/logo.png" width="200" alt="Panda Video Generator Logo">
  
  # Panda Video Generator
  
  **熊猫视频自动化引擎**

  *"Developer-first video automation."*
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![Remotion](https://img.shields.io/badge/Remotion-4.0-FF0000)](https://www.remotion.dev/)
</div>

---

## ✨ 核心特性

### 🕷️ <mark>一键</mark>网页转文本
<mark>一键</mark>抓取正文与标题（如知乎），输出结构化文件，少手工整理。

### 🎬 <mark>一键</mark>文本转视频
<mark>一键</mark>跑通口播链路：Edge TTS + VTT 字幕，Remotion 模板渲染成片。

### 🚀 <mark>一键</mark>多平台发布
<mark>一键</mark>驱动 Playwright 上传；B 站、抖音、视频号、YouTube、小红书、快手等共用相近流程。

---

## 📖 简介

Panda Video Generator 是一个全自动化的视频内容生成与发布平台，支持从网页内容提取、文本转视频到多平台发布的完整工作流。通过 AI 驱动的文本转语音（TTS）技术和视频渲染引擎，帮助内容创作者快速生成高质量视频并一键发布到多个平台。


## 📷 平台示例

<table>
  <tr>
    <td align="center"><img src="./public/media/douyin.webp" width="180" alt="抖音 · 熊猫智研社"></td>
    <td align="center"><img src="./public/media/weichat.webp" width="180" alt="微信视频号 · 熊猫智研社"></td>
    <td align="center"><img src="./public/media/kuaishou.webp" width="180" alt="快手 · 熊猫智研社"></td>
    <td align="center"><img src="./public/media/rednote.webp" width="180" alt="小红书 · 熊猫智研社"></td>
  </tr>
</table>

---

## 🎉 成品展示

> 点击图片可在新窗口播放.

[![成品展示 · 点击在 bilibili 播放](./docs/assets/1.png)](https://www.bilibili.com/video/BV19Rw9zwEd4/)

## 🛠️ 技术演示

[![技术演示 · 点击在 bilibili 播放](./docs/assets/2.png)](https://www.bilibili.com/video/BV1v5XXBMEz9/)


## 📋 功能状态

```
功能模块
├── 🕷️ 网页内容提取
│   ├── ✅ 理论上支持所有网页内容提取
│   ├── ✅ 知乎内容 + 问答特殊处理
│   ├── 🚧 HackerNews 总结+处理
│   ├── 🚧 Quora 内容提取
│   ├── 🚧 Reddit 内容提取
│   ├── 🚧 And more...
├── 🎬 文本转视频
│   ├── ✅ 自动生成语音和字幕（TTS）
│   ├── ✅ 自动渲染视频
│   └── 🚧 视频模板系统 
│       ├── ✅ 横屏模板
│       └── 🚧 竖屏模板
├── 🚀 多平台发布
│   ├── ✅ Bilibili 自动发布
│   ├── ✅ 抖音自动发布
│   ├── ✅ 微信视频号自动发布
│   ├── ✅ 小红书自动发布
│   ├── ✅ YouTube 自动发布
│   ├── ✅ 快手自动发布
│   └── ✅ And more...
└── 🔧 开发工具
    ├── ✅ 开发服务器
    └── 🚧 Github Action 自动化视频生成

```

---

## 🚀 快速开始

1. [环境配置](#env-setup) — Node、克隆、安装与自检。
2. [完整工作流示例](#full-workflow) — 知乎链路到成片与多平台发布。

<a id="env-setup"></a>
## 📦 环境配置

### 1. 环境要求

- 安装 **[Node.js 20+](https://nodejs.org/)**（≥ 20.9）。
- **ffmpeg**：须为系统安装并在终端 `PATH` 中（TTS 合并音频等依赖）。
  - macOS：`brew install ffmpeg`
  - Ubuntu：`sudo apt install ffmpeg`
  - Windows：

    - `choco install ffmpeg`（需要管理员权限）
    - 或 [ffmpeg 官网](https://ffmpeg.org/download.html) 下载并配置环境变量

### 2. 获取代码

```bash
git clone https://github.com/szhshp/panda-video-generator.git
cd panda-video-generator
```

### 3. 一键安装

- **推荐：** `pnpm install:project`
- **手动运行：**
  - macOS / Linux：`bash scripts/install.sh`
  - Windows：`powershell -ExecutionPolicy Bypass -File scripts/install.ps1`

### 4. 验证与配置

- 自检：`pnpm check:setup`
- `cp .env.example .env`，按需填写如 `DEEPSEEK_API_KEY`

---

## 📚 使用指南

### 示例: 一键从知乎生成视频

从知乎链接一键生成完整视频，自动完成内容提取、脚本生成、TTS 和视频渲染：

```bash
pnpm pipeline:zhihu-video -- <知乎问题链接>
```

（`pnpm video:zhihu` 与 `pipeline:zhihu-video` 等价。）

**示例：**
```bash
pnpm pipeline:zhihu-video -- https://www.zhihu.com/question/316150890
```

**输入：**
- 知乎问题链接（命令行参数）

**完整流程：**
1. ✅ 自动提取知乎问题内容（标题、问题、答案）
2. ✅ 使用 AI 整理并生成视频脚本
3. ✅ 自动生成 TTS 语音和字幕
4. ✅ 使用 Remotion 渲染最终视频

**输出文件：**

```
output/
├── video/
│   └── video.mp4 — 最终成片
├── spider/
│   ├── title.json — 标题 JSON
│   ├── input.txt — 口播稿
│   └── output.json — 原始爬取 JSON
└── tts/
    ├── audio.mp3 — 语音
    └── audio.vtt — 字幕
```

> **注意**：需要在 `.env.local` 文件中配置 `DEEPSEEK_API_KEY`，用于智能整理和优化提取的文稿。

### 分步执行

自备口播或对接爬虫结果时，按下面顺序即可（输出路径见上文「输出文件」树）：

1. **准备口播稿**  
   - 写入 **`output/spider/input.txt`**，或使用环境变量 **`TTS_INPUT_FILE`** 指向其它文件。  
   - 知乎链路也可由 **`pnpm spider:zhihu`** / **`pnpm caption:env`** 生成上述文件。

2. **做成视频**  
   - **一键：** `pnpm pipeline:tts-render`（与 `pnpm render:all` 相同）  
   - **分步：** `pnpm tts` → `pnpm render:video`  
   - **只重新出片**（`public/` 里 TTS 等已齐）：`pnpm render:composition`  
   - **可选素材：** 背景 **`public/video/0.mp4`**、配乐 **`public/bgm/0.mp3`**（文件名均为 **`0`**；缺背景则为黑底）。  
   - 目录默认值可用 `SPIDER_OUTPUT_DIR`、`TTS_OUTPUT_DIR`、`TTS_PUBLIC_DIR` 等调整（仍以 `package.json` 与环境说明为准）。

3. **多平台发布（可选）**  
   - 首次：**`pnpm login:<平台>`**（浏览器扫码）。  
   - 上传：**`pnpm upload:<平台>`** 或 **`pnpm upload:all`**。  
   - 元数据：**`VIDEO_TITLE`**、**`VIDEO_DESC`**、**`VIDEO_TAGS`**（例：`VIDEO_DESC=… VIDEO_TAGS=… pnpm upload:douyin`）。  
   - 更多 `login:*` / `upload:*` 见 **`package.json`**。

```bash
# 最短示例：写稿 → 出片
mkdir -p output/spider && echo "你的口播内容…" > output/spider/input.txt
pnpm pipeline:tts-render
```

---

## 🔧 开发
### 启动 Remotion Studio

```bash
# Remotion Studio（视频预览）
pnpm remotion
```


---

<a id="full-workflow"></a>
## 📝 完整工作流示例

从知乎链接到多平台发布的完整流程：

### 方式一：一键生成（推荐）

```bash
# 一键从知乎链接生成视频（组合：爬虫 / 脚本 → TTS → 渲染）
pnpm pipeline:zhihu-video -- https://www.zhihu.com/question/316150890

# 首次使用需要登录（只需一次）
pnpm login:bilibili
pnpm login:douyin
pnpm login:youtube
# ... 其他平台见 package.json 中以 login: 开头的脚本

# 发布到所有平台
VIDEO_DESC="这里是视频描述" \
VIDEO_TAGS="AI,自动化,视频生成" \
pnpm upload:all
```

### 方式二：分步操作

```bash
# 1. 提取知乎内容
pnpm spider:zhihu https://www.zhihu.com/question/316150890

# 2. 生成视频（组合：TTS + 渲染）
pnpm pipeline:tts-render

# 3. 首次使用需要登录（只需一次）
pnpm login:bilibili
pnpm login:douyin
pnpm login:youtube
# ... 其他平台见 package.json 中以 login: 开头的脚本

# 4. 发布到所有平台
VIDEO_DESC="这是一个自动生成的视频" \
VIDEO_TAGS="AI,自动化,视频生成" \
pnpm upload:all
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 👤 作者

**szhshp**

- Email: 24031shp@sina.com
- GitHub: [@szhshp](https://github.com/szhshp)

---

<div align="center">
  Made with ❤️ by szhshp x 熊猫智研社
</div>
