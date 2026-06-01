---
name: playwright-publish
description: >-
  Multi-platform browser login and video upload via Playwright Test (headed Chromium).
  Also usable in GitHub Actions CI. Use when the user mentions publishing, uploading video,
  or logging in to Bilibili, Douyin, Kuaishou, Weixin Channels, or YouTube.
---

# Playwright 多平台登录与上传

用真实浏览器驱动 **Playwright Test** 实现多平台登录和视频上传。既支持本地有头浏览器交互式操作，也可在 **GitHub Actions** 中通过 CI 自动运行。

**工作目录：** monorepo 根目录（存在 `playwright.config.ts` 与 `automations/`）。

**前置：**

```bash
pnpm exec playwright install --with-deps chromium
pnpm approve-builds  # 首次安装 playwright 后需要
```

登录态保存在 `playwright/.auth/`（已 gitignore）。每个平台首次需跑一次对应 **login spec**；用户在 headed 窗口内完成扫码或网页登录。

---

## 平台与 spec 对照

| 平台 key | Login spec | Upload spec |
|----------------|------------|-------------|
| `bilibili` | `automations/Bilibili/login-bilibili.spec.ts` | `automations/Bilibili/upload-video.spec.ts` |
| `douyin` | `automations/Douyin/login-douyin.spec.ts` | `automations/Douyin/upload-video.spec.ts` |
| `kuaishou` | `automations/Kuaishou/login-kuaishou.spec.ts` | `automations/Kuaishou/upload-video.spec.ts` |
| `weixin-video` | `automations/WeixinVideo/login-weixin-video.spec.ts` | `automations/WeixinVideo/upload-weixin-video.spec.ts` |
| `youtube` | `automations/YouTube/login-youtube.spec.ts` | `automations/YouTube/upload-video.spec.ts` |

**用户说法 → key：** B站/哔哩哔哩 → `bilibili`；抖音 → `douyin`；快手 → `kuaishou`；微信视频号/视频号 → `weixin-video`；YouTube → `youtube`。

> 小红书（RedNote）因反爬虫过于严格已移除，不再支持。

---

## 登录（每平台首次，交互式 headed 浏览器）

```bash
pnpm exec playwright test automations/Bilibili/login-bilibili.spec.ts --project=chromium --headed
```

## 上传（单平台）

```bash
pnpm exec playwright test automations/Bilibili/upload-video.spec.ts --project=chromium --headed
```

## 多平台并行上传（推荐）

每个平台一条命令，在多个终端中同时运行：

```bash
# Terminal 1
pnpm exec playwright test automations/Bilibili/upload-video.spec.ts --project=chromium --headed

# Terminal 2
pnpm exec playwright test automations/Douyin/upload-video.spec.ts --project=chromium --headed
```

## 上传全部平台

```bash
pnpm exec playwright test \
  automations/Bilibili/upload-video.spec.ts \
  automations/Douyin/upload-video.spec.ts \
  automations/YouTube/upload-video.spec.ts \
  automations/Kuaishou/upload-video.spec.ts \
  automations/WeixinVideo/upload-weixin-video.spec.ts \
  --project=chromium --headed
```

## 可选元数据

在命令前设置环境变量：

| 变量 | 说明 |
|------|------|
| `VIDEO_TITLE` | 视频标题 |
| `VIDEO_DESC` | 视频描述 |
| `VIDEO_TAGS` | 逗号分隔的标签 |

```bash
VIDEO_DESC="描述文本" VIDEO_TAGS="标签1, 标签2" \
pnpm exec playwright test automations/Douyin/upload-video.spec.ts --project=chromium --headed
```

---

## GitHub Actions CI

本项目包含两个 GitHub Actions 工作流：

- `.github/workflows/generate-video-general.yml` — 通用网页 URL → 视频 → 发布
- `.github/workflows/generate-video-zhihu.yml` — 知乎 URL → 视频 → 发布

详见 `.agent/skills/github-actions/SKILL.md`。

---

## 与 PVA CLI 的关系

项目同时提供两套发布方式：

| 方式 | 适用场景 |
|------|----------|
| `pnpm upload:*` (PVA CLI) | 本地命令行快速发布 |
| Playwright `automations/` | 有头浏览器交互、GitHub Actions CI |

二者等价，底层都驱动真实浏览器。
