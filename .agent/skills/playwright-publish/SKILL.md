---
name: playwright-publish
description: >-
  Multi-platform browser login and video upload via Playwright Test only (headed Chromium).
  Parallel uploads are allowed and encouraged: run one Playwright process per platform (e.g. separate terminals).
  Use when the user mentions publishing, uploading video, or logging in to Bilibili, Douyin,
  Kuaishou, Weixin Channels, or YouTube; or STEP3 / 多平台发布 / login:* / upload:*.
---

# Playwright 多平台登录与上传

本仓库 **STEP3**（见根目录 **README.md**「多平台发布」）用真实浏览器驱动 **Playwright**。助手**只能**执行 **Playwright Test CLI**（`pnpm exec playwright test …`）；不要用 **MCP** 浏览器工具、单独 **Puppeteer** 流程或临时脚本替代上述任务。

**并行上传（必须支持）：** 多平台上架时 **允许且应优先采用同时上传**：在 **多个终端**（或等价的多条独立 **Playwright** 进程）中 **各跑一个平台** 的 **upload spec**，每个进程各自拉起一个 **headed Chromium**，彼此独立。**不要**默认假设「只能开一个浏览器」或强行串行（例如不必要的单命令 `--workers=1`），除非用户明确要求顺序执行、或机器 **RAM/CPU** 明显不足需降级。默认成片 **`output/video/video.mp4`** 可被多个进程只读并发打开，无需互斥。

**工作目录：** **monorepo 根目录**（存在 `playwright.config.ts` 与 `automations/`）。

**前置：** 若缺少浏览器，执行：

```bash
pnpm exec playwright install --with-deps chromium
```

登录态保存在 **`playwright/.auth/`**（已 **gitignore**）。每个平台**首次**需跑一次对应 **login spec**；用户在 **headed** 窗口内完成扫码或网页登录。

---

## 平台与 spec 对照

**spec** 路径与参数须**完全一致**：**`--project=chromium --headed`**。

| 平台 key | Login spec | Upload spec |
|----------------|------------|-------------|
| `bilibili` | `automations/Bilibili/login-bilibili.spec.ts` | `automations/Bilibili/upload-video.spec.ts` |
| `douyin` | `automations/Douyin/login-douyin.spec.ts` | `automations/Douyin/upload-video.spec.ts` |
| `kuaishou` | `automations/Kuaishou/login-kuaishou.spec.ts` | `automations/Kuaishou/upload-video.spec.ts` |
| `weixin-video` | `automations/WeixinVideo/login-weixin-video.spec.ts` | `automations/WeixinVideo/upload-weixin-video.spec.ts` |
| `youtube` | `automations/YouTube/login-youtube.spec.ts` | `automations/YouTube/upload-video.spec.ts` |

**用户说法 → key：** B站/哔哩哔哩 → `bilibili`；抖音 → `douyin`；快手 → `kuaishou`；微信视频号/视频号 → `weixin-video`；YouTube → `youtube`。

---

## 命令（仅 Playwright CLI）

从上表复制 **Login spec** / **Upload spec** 路径（逐字一致；各目录文件名不同，例如微信视频号为 `upload-weixin-video.spec.ts`）。

**登录（每平台首次，交互）：**

```bash
pnpm exec playwright test automations/Douyin/login-douyin.spec.ts --project=chromium --headed
```

**上传（单平台）：**

```bash
pnpm exec playwright test automations/Douyin/upload-video.spec.ts --project=chromium --headed
```

按目标平台替换为上表中的成对路径。

**多平台同时上传（推荐）：** 每个平台 **一条命令 + 一个终端**（或后台进程），例如 B 站与抖音 **并行**：

```bash
# Terminal 1
pnpm exec playwright test automations/Bilibili/upload-video.spec.ts --project=chromium --headed
```

```bash
# Terminal 2
pnpm exec playwright test automations/Douyin/upload-video.spec.ts --project=chromium --headed
```

也可用 `pnpm upload:bilibili` / `pnpm upload:douyin` 等与上 **等价** 的脚本。助手帮用户跑多平台上架时，应 **主动采用** 上述并行方式（或说明让用户开多终端同时跑），而不是先验地串行化。

**上传全部平台（单条命令；`package.json` 的 `upload:all` 同义）：**

```bash
pnpm exec playwright test \
  automations/Bilibili/upload-video.spec.ts \
  automations/Douyin/upload-video.spec.ts \
  automations/YouTube/upload-video.spec.ts \
  automations/Kuaishou/upload-video.spec.ts \
  automations/WeixinVideo/upload-weixin-video.spec.ts \
  --project=chromium --headed
```

单条命令下各 **spec** 是否并行取决于 **`playwright.config`** 的 **`workers`** / **`fullyParallel`**；若需要 **确定** 多个有头窗口同时存在，仍以 **多终端各一条 upload 命令** 为准。

**可选元数据**（与 **README** 一致）：若用户要标题/描述/标签，在命令前设置环境变量：

- `VIDEO_TITLE`
- `VIDEO_DESC`
- `VIDEO_TAGS`

示例：

```bash
VIDEO_DESC="示例描述" VIDEO_TAGS="标签1, 标签2" \
pnpm exec playwright test automations/Douyin/upload-video.spec.ts --project=chromium --headed
```

---

## 工作流检查清单

1. **成片路径：** 默认管线产出为 **`output/video/video.mp4`**（见 **README**）；上传依赖项目/ **spec** 内默认环境，除非用户在 **spec** 里改过。
2. **平台首次使用：** 执行该平台 **login** 的 **Playwright** 命令；等待用户在浏览器内完成认证。
3. **上传：** 执行对应 **upload spec**。多平台时 **优先并行**（多终端各一条命令，见上）；也可用单条 **`upload:all`** 式命令（行为依赖 **Playwright** 并行配置）。
4. **失败：** 可按需用 **`--last-failed`** 重跑；**Chromium** 安装问题用 `pnpm exec playwright install --with-deps chromium`。

---

## 与 `package.json` 脚本的关系

`pnpm login:<platform>`、`pnpm upload:<platform>`、`pnpm upload:all` 与上述 `playwright test …` **等价**。若用户或策略要求「只出现 **Playwright** 命令行」，优先 **`pnpm exec playwright test`**；否则用 **pnpm** 脚本亦可（底层仍是 **Playwright**）。

---

## 不做的事

- 不在本仓库流程里用非 **Playwright** 的浏览器自动化实现这些平台的登录/上传。
- 不在 skill 里存放密钥；凭据由用户在 **headed** 浏览器中输入。
