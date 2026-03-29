#!/bin/bash

# Remotion "Video" composition only — no sync, no cover.
# Expects public/tts (and optional public/video/title.json) already correct.
# Usage: ./scripts/render-composition-only.sh (from repo root)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

VIDEO_PUBLIC_DIR="${VIDEO_PUBLIC_DIR:-public/video}"
TITLE_PUBLIC="$VIDEO_PUBLIC_DIR/title.json"
OUTPUT_FILE="output/video/video.mp4"
mkdir -p output/video

PROPS_FILE=""
if [ -f "$TITLE_PUBLIC" ]; then
	PROPS_FILE="output/video/render-props.json"
	TitlePath="$TITLE_PUBLIC" node -e "
        const fs = require('fs');
        const p = process.env.TitlePath;
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (data.title) {
                const props = JSON.stringify({ title: data.title }, null, 2);
                fs.writeFileSync('output/video/render-props.json', props, 'utf8');
            }
        } catch (e) {}
    "
else
	echo -e "${YELLOW}⚠️  No $TITLE_PUBLIC — using default title${NC}"
fi

RENDER_OPTS="--codec=h264 --crf=23"
if [ -n "$PROPS_FILE" ] && [ -f "$PROPS_FILE" ]; then
	echo -e "${BLUE}🎬 Remotion only → $OUTPUT_FILE${NC}"
	pnpm exec remotion render Video "$OUTPUT_FILE" --props="$PROPS_FILE" $RENDER_OPTS
	rm -f "$PROPS_FILE"
else
	echo -e "${BLUE}🎬 Remotion only → $OUTPUT_FILE${NC}"
	pnpm exec remotion render Video "$OUTPUT_FILE" $RENDER_OPTS
fi

echo -e "${GREEN}✅ Done: $OUTPUT_FILE${NC}"
