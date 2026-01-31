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

Panda Video Generator 是一个全自动化的视频内容生成与发布平台，支持从网页内容提取、文本转视频到多平台发布的完整工作流。通过 AI 驱动的文本转语音（TTS）技术和 Remotion 视频渲染引擎，帮助内容创作者快速生成高质量视频并一键发布到多个平台。


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
- **平台支持**：Bilibili、抖音、微信视频号等

---


## 📋 功能状态

```
功能模块
├── 🕷️ 网页内容提取
│   ├── ✅ 知乎内容提取
│   ├── 🚧 Bilibili 专栏提取
│   ├── 🚧 Quora 内容提取
│   ├── 🚧 Reddit 内容提取
│   └── 🚧 HackerNews 内容提取
├── 🎬 文本转视频
│   ├── ✅ 自动生成语音和字幕（TTS）
│   ├── ✅ 自动渲染视频
│   └── 🚧 视频模板系统
├── 🚀 多平台发布
│   ├── ✅ Bilibili 自动发布
│   ├── ✅ 抖音自动发布
│   ├── ✅ 微信视频号自动发布
│   ├── 🚧 小红书自动发布
│   └── 🚧 快手自动发布
└── 🔧 开发工具
    ├── ✅ 开发服务器
    ├── 🚧 Docker 自动化
    └── 🚧 Github Actions 自动化

```

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.0.0
- **Python** >= 3.8（用于 TTS）
- **pnpm** >= 8.0.0（推荐）或 npm/yarn

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd remotion-next
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**（可选）
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，配置相关 API 密钥
   ```

---

## 📚 使用指南

### 1. 网页内容提取

从知乎提取内容并生成文本文件：

```bash
pnpm spider:zhihu <知乎文章链接>
```

**前置配置：**

在 `.env` 文件中配置 DEEPSEEK LLM API 密钥，用于智能整理和优化提取的文稿：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

**输出：**
- `input/input.txt` - 提取并整理后的正文内容
- `out/title.json` - 文章标题

**示例：**
```bash
pnpm spider:zhihu https://zhuanlan.zhihu.com/p/123456789
```

> **注意**：DEEPSEEK LLM 用于对提取的原始内容进行智能整理、格式化和优化，确保输出文本的质量和可读性。

### 2. 文本转视频

将文本文件转换为视频：

```bash
pnpm render:video
```

**工作流程：**
1. 读取 `input/input.txt` 文本文件
2. 调用 Python TTS 脚本生成语音和字幕
3. 使用 Remotion 渲染视频模板
4. 输出最终视频文件

**输出：**
- `out/video.mp4` - 最终渲染的视频
- `audio/audio.mp3` - 生成的语音文件
- `audio/audio.vtt` - 字幕文件

### 3. 多平台发布

#### 首次使用：平台登录

首次使用需要在浏览器中完成平台认证：

```bash
# Bilibili 登录
pnpm test:login:bilibili

# 抖音登录
pnpm test:login:douyin

# 微信视频号登录
pnpm test:login:weixin
```

#### 上传视频

**单个平台上传：**
```bash
pnpm test:upload:bilibili
pnpm test:upload:douyin
pnpm test:upload:weixin
```

**批量上传到所有平台：**
```bash
pnpm test:upload:all
```

#### 配置视频信息

通过环境变量配置视频元数据：

```bash
VIDEO_TITLE="视频标题" \
VIDEO_DESC="视频描述内容" \
VIDEO_TAGS="标签1,标签2,标签3" \
pnpm test:upload:douyin
```

**配置说明：**
- `VIDEO_TITLE` - 视频标题（可选，默认使用 `out/title.json`）
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

```bash
# 1. 提取知乎内容
pnpm spider:zhihu https://zhuanlan.zhihu.com/p/123456789

# 2. 生成视频
pnpm render:video

# 3. 首次使用需要登录（只需一次）
pnpm test:login:bilibili
pnpm test:login:douyin

# 4. 发布到所有平台
VIDEO_DESC="这是一个自动生成的视频" \
VIDEO_TAGS="AI,自动化,视频生成" \
pnpm test:upload:all
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
  Made with ❤️ by 熊猫智研社
</div>
