# 完整工作流示例

[← README](../README.md) · [索引](./README.md) · [CLI](./cli-usage-guide.md) · [分步](./step-by-step.md) · [开发](../README.md#development)

<a id="full-workflow"></a>

### 方式一：一键生成

```bash
# 一键从知乎链接生成视频（组合：爬虫 / 脚本 → TTS → 渲染）
pnpm pipeline:zhihu-video -- https://www.zhihu.com/question/316150890

# 首次使用需要登录（只需一次）
pnpm login:bilibili
pnpm login:douyin
# ... 其他平台见 package.json 中以 login: 开头的脚本

# 发布到所有平台
VIDEO_DESC="这里是视频描述" \
VIDEO_TAGS="AI,自动化,视频生成" \
pnpm upload:all
```

### 方式二：分步操作（命令行）

```bash
# 1. STEP1：提取知乎内容
pnpm spider:zhihu -- https://www.zhihu.com/question/316150890

# 2. STEP2：TTS
pnpm tts

# 3. STEP3：成片渲染
pnpm render:video

# 4. STEP4：发布（首次使用需要 login，只需一次）
pnpm login:bilibili
pnpm login:douyin
# ... 其他平台见 package.json 中以 login: 开头的脚本

VIDEO_DESC="这是一个自动生成的视频" \
VIDEO_TAGS="AI,自动化,视频生成" \
pnpm upload:all
```

（若希望 **STEP2 + STEP3** 一条命令完成，可将上述第 2、3 步替换为 **`pnpm pipeline:tts-render`**。）

---

知乎一键流水线细节另见 **[CLI 使用指南](./cli-usage-guide.md)**。各 STEP 的参数与可选配置见 **[分步操作详细说明](./step-by-step.md)**。
