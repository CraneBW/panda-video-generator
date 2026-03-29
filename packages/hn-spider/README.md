# hn-spider

Hacker News → DeepSeek → WeChat Official Account HTML pipeline. Package name: `@panda-video-generator/hn-spider`. Mirrors `zhihu-to-weixin-mp-article.ts`: reads `DEEPSEEK_API_KEY` from the **monorepo root** `.env.local` (see root `.env.example`) or from the process environment; writes `weixin-mp-article.json` and `.html`.

## Setup

From the monorepo root:

```bash
pnpm install
```

Set `DEEPSEEK_API_KEY` in the repo root `.env.local` (not inside this package).

## Run

From the monorepo root:

```bash
pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp
pnpm --filter @panda-video-generator/hn-spider hn:weixin-mp:dry    # fetch HN only, no DeepSeek / writes
```

Or `cd packages/hn-spider` and run `pnpm hn:weixin-mp` / `pnpm hn:weixin-mp:dry`.

Edit `hn-config.json` for score thresholds, keywords, and output paths (relative to current working directory).
