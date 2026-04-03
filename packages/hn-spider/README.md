# @panda-video-generator/hn-spider

Hacker News → DeepSeek → WeChat Official Account HTML pipeline (`weixin-mp-article.json` / `.html`). Reads **`DEEPSEEK_API_KEY`** from the **monorepo root** `.env` (onboard from [`.env.example`](../../.env.example)) or from the process environment.

**Run (from repo root):**

```bash
pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp
pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp:dry
```

Edit `hn-config.json` for thresholds, keywords, and output paths (relative to cwd).

There is no Agent Skill for this package yet; extend here or add `../../.agent/skills/hn-spider/SKILL.md` when you want the same stub pattern as other packages.
