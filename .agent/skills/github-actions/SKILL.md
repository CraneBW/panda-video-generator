---
name: github-actions
description: >-
  GitHub Actions CI workflows for automated video generation and publishing.
  Use when user asks about CI, GitHub Actions, automated pipeline, or cloud render.
---

# GitHub Actions CI

两个 GitHub Actions 工作流实现了从 URL 到成片的全自动云端流水线。

## 工作流概览

### `generate-video-general.yml`

通用网页 → 视频流水线：

1. `actions/checkout` — 检出代码
2. `Setup pnpm & Node` — 安装 pnpm 和 Node.js 20+
3. `Install dependencies` — `pnpm install`
4. `Install Playwright Chromium` — `pnpm exec playwright install --with-deps chromium`
5. `Extract content` — `pnpm spider:extract:url`（需要 `SPIDER_SOURCE` 环境变量）
6. `Generate caption` — `pnpm caption:env`（DeepSeek/Kimi LLM 生成口播）
7. `TTS` — `pnpm tts`
8. `Render video` — `pnpm render:video`
9. `Upload artifact` — 上传 `output/video/video.mp4` 作为 workflow artifact

### `generate-video-zhihu.yml`

知乎问题 → 视频流水线：

1-4. 同上（checkout / setup / install / chromium）
5. `Spider Zhihu` — `pnpm spider:zhihu -- <URL>`（含抓取 + LLM 口播生成）
6. `TTS` — `pnpm tts`
7. `Render video` — `pnpm render:video`
8. `Upload artifact` — 上传成片

## 触发方式

两个工作流都支持：

- **手动触发** — `workflow_dispatch`，在 GitHub Actions 页面点击 "Run workflow"
- **定时触发** — `schedule`（cron），可在 workflow 文件中配置

## 环境变量（Secrets）

需要在 GitHub 仓库 `Settings → Secrets and variables → Actions` 中配置：

| Secret | 说明 |
|--------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（口播生成） |
| `LLM_PROVIDER` | LLM 提供商（`deepseek` 或 `kimi`） |
| `MOONSHOT_API_KEY` | Kimi API 密钥（使用 Kimi 时需要） |
| `EDGE_TTS_VOICE` | TTS 音色（默认 `zh-CN-YunjianNeural`） |

通用流水线还需要：
| Secret | 说明 |
|--------|------|
| `SPIDER_SOURCE` | 目标网页 URL |

知乎流水线通过 `workflow_dispatch` 的 `inputs` 传入 URL。

## 产物

- `output/video/video.mp4` — 最终成片（workflow artifact）
- `output/video/cover.jpg` — 封面图

## 注意事项

- 需要 **ffmpeg**（GitHub Actions `ubuntu-latest` 自带）
- 首次运行时 Remotion 会下载 Chrome Headless Shell（约 100MB）
- 知乎流水线内置 DeepSeek 口播生成步骤
