# @panda-video-generator/caption-generator

Structured JSON → narration script (OpenAI-compatible API). **Default:** DeepSeek. **Kimi:** `LLM_PROVIDER=kimi` + `MOONSHOT_API_KEY` (default base `https://api.moonshot.cn/v1`, model `kimi-k2.5`). See [`llm-config.ts`](./llm-config.ts).

Prompts: [`video-script-prompts.ts`](./video-script-prompts.ts) (`@panda-video-generator/caption-generator/prompts`). Run: **`pnpm caption:env`**.

**Docs:** [`.agent/skills/caption-generator/SKILL.md`](../../.agent/skills/caption-generator/SKILL.md)
