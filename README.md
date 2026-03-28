<div align="center">
  <img src="./public/logo/logo.png" width="200" alt="Panda Video Generator Logo">
  
  # Panda Video Generator
  
  **熊猫视频自动化引擎**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
  [![Remotion](https://img.shields.io/badge/Remotion-4.0-FF0000)](https://www.remotion.dev/)
</div>

---

## 📖 简介

Panda Video Generator 是一个全自动化的视频内容生成与发布平台，支持从网页内容提取、文本转视频到多平台发布的完整工作流。通过 AI 驱动的文本转语音（TTS）技术和视频渲染引擎，帮助内容创作者快速生成高质量视频并一键发布到多个平台。



<table>
  <tr>
    <td align="center">
      <img src="./public/media/douyin.webp" width="200" alt="douyin">
    </td>
    <td align="center">
      <img src="./public/media/weichat.webp" width="200" alt="weichat">
    </td>
  </tr>
</table>


---

## ✨ 核心特性

### 🕷️ <span style="color: #FF6B6B; font-weight: bold; font-size: 1.1em;">一键</span>网页转文本
- **<span style="color: #FF6B6B; font-weight: bold;">一键</span>提取**：只需一个命令，自动识别并提取网页核心内容
- **多平台支持**：支持知乎、Bilibili 等主流平台
- **结构化输出**：自动生成标题和正文文本文件，无需手动处理

### 🎬 <span style="color: #FF6B6B; font-weight: bold; font-size: 1.1em;">一键</span>文本转视频
- **<span style="color: #FF6B6B; font-weight: bold;">一键</span>生成**：从文本到视频，全程自动化，无需人工干预
- **AI 语音合成**：基于 Edge TTS 的高质量语音生成
- **自动字幕生成**：同步生成 VTT 字幕文件
- **专业视频模板**：使用 Remotion 构建的可定制视频模板

### 🚀 <span style="color: #FF6B6B; font-weight: bold; font-size: 1.1em;">一键</span>多平台统一发布
- **<span style="color: #FF6B6B; font-weight: bold;">一键</span>发布**：一次命令，同时发布到多个平台
- **统一发布接口**：一次配置，多平台同步
- **自动化上传**：基于 Playwright 的浏览器自动化
- **平台支持**：Bilibili、抖音、微信视频号、YouTube、小红书等


---

## 📋 功能状态

```
功能模块
├── 🕷️ 网页内容提取
│   ├── ✅ 知乎内容提取
│   ├── 🚧 Bilibili 专栏提取
│   ├── 🚧 Quora 内容提取
│   ├── 🚧 Reddit 内容提取
├── 🎬 文本转视频
│   ├── ✅ 自动生成语音和字幕（TTS）
│   ├── ✅ 自动渲染视频
│   └── 🚧 视频模板系统
├── 🚀 多平台发布
│   ├── ✅ Bilibili 自动发布
│   ├── ✅ 抖音自动发布
│   ├── ✅ 微信视频号自动发布
│   ├── ✅ 小红书自动发布
│   ├── ✅ YouTube 自动发布
│   └── ✅ 快手自动发布
└── 🔧 开发工具
    ├── ✅ 开发服务器
    └── 🚧 自动化

```

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.0.0
- **ffmpeg**（`pnpm tts` 合并与变速需要；渲染视频通常也已安装）
- **pnpm** >= 8.0.0（推荐）或 npm/yarn

#### TTS（Node）

`pnpm tts` 使用 [`packages/tts-node`](packages/tts-node/README.md)（`node-edge-tts` + `music-metadata` + 系统 **ffmpeg**）。

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/szhshp/panda-video-generator.git
   cd panda-video-generator
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**（可选）
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置 AI 大模型 API 密钥
   ```

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
- `output/video/video.mp4` - 最终渲染的视频
- `output/spider/title.json` - 标题 JSON（知乎爬虫写入；渲染时复制到 `public/video/title.json`）
- `output/tts/audio.mp3` - 生成的语音文件
- `output/tts/audio.vtt` - 字幕文件
- `output/spider/input.txt` - 视频口播稿（默认；知乎爬虫 / `caption:env` 写入）
- `output/spider/output.json` - 原始爬取 JSON（固定名，每次覆盖）

> **注意**：需要在 `.env.local` 文件中配置 `DEEPSEEK_API_KEY`，用于智能整理和优化提取的文稿。

### 分步执行

如果需要分步操作或使用其他来源的文本，可以按以下步骤执行：

#### 1. 准备文本内容

将口播稿保存为 **`output/spider/input.txt`**（与 **`output/spider/output.json`** 同目录），或设置环境变量 **`TTS_INPUT_FILE`** 指向任意路径。

**操作步骤：**
1. `mkdir -p output/spider`
2. 将文本写入 `output/spider/input.txt`（或由 `pnpm spider:zhihu` / `pnpm caption:env` 自动生成）

**示例：**
```bash
mkdir -p output/spider
echo "你的视频脚本内容..." > output/spider/input.txt
```

> **提示**：`pnpm spider:zhihu` 会写入 **`output/spider/output.json`**，并把 DeepSeek 口播稿写到默认的 **`output/spider/input.txt`**（可通过 `TTS_INPUT_FILE` 改成例如 `output/tts/input.txt`）。

#### 2. 文本转视频

将文本文件转换为视频：

**输入：**
- 默认 **`output/spider/input.txt`**（`pnpm tts` / `SPIDER_OUTPUT_DIR`）

```bash
# Composed: TTS + sync + Remotion + cover
pnpm pipeline:tts-render

#（`pnpm render:all` 与 `pipeline:tts-render` 等价。）

# Or step by step:
pnpm tts              # Edge-TTS → mp3/vtt，并同步到 public（路径见环境变量说明）
pnpm render:video     # Remotion → output/video/video.mp4 (+ cover)
```

可选环境变量：`SPIDER_OUTPUT_DIR`（默认 `output/spider`）、`TTS_INPUT_FILE`（默认 `$SPIDER_OUTPUT_DIR/input.txt`）、`TTS_OUTPUT_DIR`、`TTS_PUBLIC_DIR`。

**工作流程：**
1. 读取口播稿（默认 `output/spider/input.txt`）
2. `pnpm tts`：Node Edge-TTS 生成语音和字幕
3. `pnpm render:video`：使用 Remotion 渲染视频模板并生成封面
4. 输出最终视频文件

**输出：**
- `output/video/video.mp4` - 最终渲染的视频
- `output/spider/title.json` - 标题 JSON（知乎爬虫写入；渲染时复制到 `public/video/title.json`）
- `output/tts/audio.mp3` - 生成的语音文件
- `output/tts/audio.vtt` - 字幕文件

#### 3. 多平台发布

**输入：**
- `output/video/video.mp4` - 待上传的视频文件
- `output/spider/title.json` - 视频标题（可选；路径随 `SPIDER_OUTPUT_DIR`）
- 环境变量（可选）：`VIDEO_TITLE`、`VIDEO_DESC`、`VIDEO_TAGS`

##### 首次使用：平台登录

首次使用需要在浏览器中完成各个平台的登录认证。`pnpm login:*` 脚本已带上 **有界面模式**（Playwright `--headed`），会弹出 Chromium 窗口，便于扫码或手动登录。

```bash
# Bilibili 登录
pnpm login:bilibili

# 抖音登录
pnpm login:douyin

# 微信视频号登录（Cookie 有效期较短，需定期重新登录）
pnpm login:weixin-video

# YouTube 登录
pnpm login:youtube

# 其他平台：小红书、快手 — 见 package.json 中以 login: 开头的脚本
```

##### 上传视频

`pnpm upload:*` 与 **`pnpm upload:all`** 同样使用 **有界面浏览器**（`--headed`），便于处理验证码、确认弹窗等。

**单个平台上传：**
```bash
pnpm upload:bilibili
pnpm upload:douyin
pnpm upload:weixin-video
pnpm upload:youtube
# 小红书、快手等见 package.json 中以 upload: 开头的脚本（批量用 upload:all）
```

**批量上传到所有平台：**
```bash
pnpm upload:all
```


##### 配置视频信息

通过环境变量配置视频元数据：

```bash
VIDEO_TITLE="视频标题" \
VIDEO_DESC="视频描述内容" \
VIDEO_TAGS="标签1,标签2,标签3" \
pnpm upload:douyin
```

**配置说明：**
- `VIDEO_TITLE` - 视频标题（可选，默认使用 `output/spider/title.json`）
- `VIDEO_DESC` - 视频描述
- `VIDEO_TAGS` - 视频标签（逗号分隔）

---

## 🔧 开发

### 启动开发服务器

```bash
# Next.js 开发服务器
pnpm dev

# Remotion Studio（视频预览）
pnpm remotion
```

### 代码检查

```bash
pnpm lint
```

### 构建项目

```bash
pnpm build
```

---

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
VIDEO_DESC="这是一个自动生成的视频" \
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
