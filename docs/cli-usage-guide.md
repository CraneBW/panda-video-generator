# CLI 使用指南（命令行）

[← README](../README.md) · [索引](./README.md) · [分步说明](./step-by-step.md) · [工作流](./full-workflow.md) · [开发](../README.md#development)

<a id="cli-usage-guide"></a>
<a id="usage-guide"></a>

本文说明如何通过 **CLI（命令行）** 使用本项目，与 [自动化向导](../README.md#wizard-automation) 在后台执行的脚本一致，便于自动化与按需拆分步骤。

### 示例：一键从知乎生成视频

从知乎链接一键生成完整视频，自动完成内容提取、脚本生成、TTS 和视频渲染：

```bash
pnpm pipeline:zhihu-video -- <知乎问题链接>
```

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

<a id="usage-output"></a>

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

> **注意**：口播依赖根目录 **`.env`**（**[`.env.example`](../.env.example)** · **[caption SKILL](../.agent/skills/caption-generator/SKILL.md)**）。

### 更多文档

| 文档 | 说明 |
|------|------|
| [文档索引](./README.md) | 分册总览 |
| [分步操作详细说明](./step-by-step.md) | STEP1–STEP4、`login:*` / `upload:*`、素材与环境变量 |
| [完整工作流示例](./full-workflow.md) | 本地一键与分步命令合集 |
| [开发](../README.md#development) | Remotion Studio |
| [功能状态](../README.md#feature-status) | 能力清单与规划 |
