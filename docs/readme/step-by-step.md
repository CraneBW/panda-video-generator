# 分步操作详细说明

[← README](../../README.md) · [索引](./README.md) · [CLI](./cli-usage-guide.md) · [工作流](./full-workflow.md) · [开发](../../README.md#development)

- **顺序**
  - **STEP1** 文稿 → **STEP2** TTS → **STEP3** 成片渲染 → **STEP4** 多平台发布（可选）
  - **向导**：界面上对应 **STEP2**（TTS）与 **STEP3**（渲染）两个界面步骤
  - **命令行**：可用 **`pnpm pipeline:tts-render`** 一次完成 **STEP2 + STEP3**
  - **发布**：**STEP4**，使用 **`login:*`** / **`upload:*`**（见下文）
- **路径**
  - 与 [CLI 使用指南 · 输出目录](./cli-usage-guide.md#usage-output) 中「输出文件」目录树一致

## STEP1：文稿准备+整理

- **目标**
  - 得到 **`output/spider/input.txt`** 供 TTS 使用（默认路径；可自定义 **`TTS_INPUT_FILE`**）
- **做法（三选一）**
  - **手工写稿**
    - **写入：** **`output/spider/input.txt`**
    - **分段：** 每个**非空行**为一段，**STEP2** 中 TTS 按段合成
    - **说明：** 不会自动润色；定稿后再进入 **STEP2**
  - **知乎爬虫 + LLM**
    - **命令：** **`pnpm spider:zhihu -- <知乎问题 URL>`**
    - **产出：**
      - **`output/spider/output.json`**
      - **`output/spider/input.txt`**、**`title.json`**（LLM 生成）
    - **依赖：** 根目录 **`.env`** 口播密钥，见 **[`.env.example`](../../.env.example)** / [SKILL](../../.agent/skills/caption-generator/SKILL.md)
    - **示例：**
      ```bash
      pnpm spider:zhihu -- https://www.zhihu.com/question/2021664832844308557
      ```
    - **改读稿路径：** 环境变量 **`TTS_INPUT_FILE`**
  - **通用网页爬虫 + 成稿**
    - **爬取**
      - **环境变量：** **`SPIDER_SOURCE`** = 页面完整 **http(s)** URL
      - **命令：** **`pnpm spider:extract:url`**
      - **产出：** **`output/spider/output.json`**（仅 `title`、`content`，**无** `input.txt`）
    - **成稿**
      - **命令：** **`pnpm caption:env`**
      - **产出：** **`output/spider/input.txt`**、**`captions.vtt`**
      - **依赖：** 同上（`.env` 口播）
      - **可选参数：** **`CAPTION_INPUT_JSON`** 指向其它 JSON（默认即为 **`output/spider/output.json`**）
    - **示例：**

      ```bash
      SPIDER_SOURCE='https://example.com/article' pnpm spider:extract:url
      pnpm caption:env
      ```

## STEP2：TTS（语音与字幕）

向导里对应「TTS」一步；完成后进入 **STEP3** 渲染成片。

- **前置**
  - **`output/spider/input.txt`** 已存在（或 **`TTS_INPUT_FILE`** 指向有效文稿）
- **命令**
  - **`pnpm tts`**
  - 若要与 **STEP3** 连续执行： **`pnpm pipeline:tts-render`**（内部等价于 **`pnpm tts`** → **`pnpm render:video`**）
- **可选配置**
  - **目录（环境变量）**
    - **`SPIDER_OUTPUT_DIR`**、**`TTS_OUTPUT_DIR`**、**`TTS_PUBLIC_DIR`** 等 → 详见 **`package.json`** 与各脚本
  - **TTS 音色**
    - **环境变量：** **`EDGE_TTS_VOICE`**
    - **可选值：** 详见 [可选音色名称列表](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts)
      - 在里面搜索 `zh-CN` 即可找到所有中文音色
        - `zh-CN-XiaoxiaoNeural` → 晓晓
        - `zh-CN-YunjianNeural` → 云健
      - 这里可以试听: [EdgeTTS 试听](https://edge-tts.com/)
    - **示例：**
      ```bash
      EDGE_TTS_VOICE="zh-CN-XiaoxiaoNeural" pnpm tts
      ```

## STEP3：成片渲染

向导里对应「渲染」一步。

- **前置**
  - **STEP2** 已生成语音与字幕（默认在 **`output/tts/`**，并由脚本同步到 **`public/tts/`** 等，详见 **`package.json`**）
- **命令**
  - **`pnpm render:video`**
  - **仅重渲染（`public/` 素材已齐）：** **`pnpm render:composition`**
  - 若尚未执行 **STEP2**，可一次跑完 **STEP2 + STEP3**： **`pnpm pipeline:tts-render`**
- **可选配置**
  - **片内素材**
    - **背景：** **`public/video/0.mp4`**
    - **配乐：** **`public/bgm/0.mp3`**
    - **命名：** 均为 **`0`**；无背景则黑底

<a id="playwright-publish"></a>

## STEP4：多平台发布（可选）

- **登录（每平台首次）**
  - **`pnpm login:<平台>`**（需要浏览器扫码）
- **上传**
  - **`pnpm upload:<平台>`** 或 **`pnpm upload:all`**
- **元数据（可选环境变量）**
  - **`VIDEO_TITLE`**、**`VIDEO_DESC`**、**`VIDEO_TAGS`**
- **示例**

  ```bash
  VIDEO_DESC="这是一个关于老子的视频" \
  VIDEO_TAGS="老子, 道教, 学术, 文化" \
  pnpm upload:douyin
  ```

---

[CLI 使用指南 →](./cli-usage-guide.md) · [完整工作流示例 →](./full-workflow.md)
