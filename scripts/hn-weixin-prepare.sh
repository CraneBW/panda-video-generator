#!/usr/bin/env bash
# One-shot HN -> WeChat article files (no Playwright). Run from repo root via pnpm hn:weixin-prep.
#
# HN_PREP_MODE:
#   digest (default) — N stories + bodies -> one DeepSeek article -> weixin-mp-article.json/.html
#   batch          — N separate DeepSeek articles -> weixin-mp-article-articles.json (+ per-html), for Playwright merge+TOC
#   spider         — snapshot only -> hn-spider-snapshot.json (no DeepSeek)
#
# Optional env (see spider/hn-spider/hn.ts header): HN_DIGEST_STORY_COUNT, HN_WEIXIN_ARTICLE_COUNT, HN_DIGEST_IGNORE_PROCESSED, etc.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${HN_PREP_MODE:-digest}"

case "$MODE" in
  digest)
    pnpm exec tsx spider/hn-spider/hn.ts --digest
    ;;
  batch)
    export HN_WEIXIN_ARTICLE_COUNT="${HN_WEIXIN_ARTICLE_COUNT:-5}"
    pnpm exec tsx spider/hn-spider/hn.ts
    ;;
  spider)
    pnpm exec tsx spider/hn-spider/hn.ts --spider-only
    ;;
  *)
    echo "HN_PREP_MODE must be digest, batch, or spider (got: ${MODE})" >&2
    exit 1
    ;;
esac
