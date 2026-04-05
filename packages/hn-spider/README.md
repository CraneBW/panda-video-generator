# @panda-video-generator/hn-spider

Hacker News → DeepSeek → WeChat article HTML (`weixin-mp-article.json` / `.html`). **`DEEPSEEK_API_KEY`** from repo root `.env` only (not caption / Kimi).

**Run (repo root):**

```bash
pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp
pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp:dry
```

Edit `hn-config.json` for thresholds, keywords, and output paths (relative to cwd).

There is no Agent Skill for this package yet; extend here or add `../../.agent/skills/hn-spider/SKILL.md` when you want the same stub pattern as other packages.
