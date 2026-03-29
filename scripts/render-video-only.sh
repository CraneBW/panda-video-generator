#!/bin/bash

# Single step: sync output/* → public/* (--require-tts), then Remotion render + cover.
# Requires TTS artifacts under TTS_OUTPUT_DIR (run pnpm tts or use pipeline-tts-then-render.sh).
# Usage: ./scripts/render-video-only.sh (from repo root)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

TTS_OUTPUT_DIR="${TTS_OUTPUT_DIR:-output/tts}"
TTS_PUBLIC_DIR="${TTS_PUBLIC_DIR:-public/tts}"
SPIDER_OUTPUT_DIR="${SPIDER_OUTPUT_DIR:-output/spider}"
VIDEO_PUBLIC_DIR="${VIDEO_PUBLIC_DIR:-public/video}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎬 Remotion video + cover${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

bash "$SCRIPT_DIR/sync-outputs-to-public.sh" --require-tts
echo ""

OUTPUT_FILE="output/video/video.mp4"
mkdir -p output/video

TITLE_PUBLIC="$VIDEO_PUBLIC_DIR/title.json"
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
    echo -e "${YELLOW}⚠️  No $TITLE_PUBLIC — using default title for render${NC}"
fi

RENDER_OPTS="--codec=h264 --crf=23"
if [ -n "$PROPS_FILE" ] && [ -f "$PROPS_FILE" ]; then
    echo -e "${BLUE}🎬 Rendering Video → $OUTPUT_FILE${NC}"
    if ! pnpm exec remotion render Video "$OUTPUT_FILE" --props="$PROPS_FILE" $RENDER_OPTS; then
        echo -e "${RED}❌ Failed to render video${NC}"
        rm -f "$PROPS_FILE"
        exit 1
    fi
else
    echo -e "${BLUE}🎬 Rendering Video → $OUTPUT_FILE${NC}"
    if ! pnpm exec remotion render Video "$OUTPUT_FILE" $RENDER_OPTS; then
        echo -e "${RED}❌ Failed to render video${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}🖼️  Cover image...${NC}"

COVER_OUTPUT="output/video/cover.jpg"
COVER_PNG_OUTPUT="output/video/cover.png"
COVER_GENERATED=false

if [ -n "$PROPS_FILE" ] && [ -f "$PROPS_FILE" ]; then
    if pnpm exec remotion still Cover-Still "$COVER_PNG_OUTPUT" --props="$PROPS_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ Cover PNG: $COVER_PNG_OUTPUT${NC}"
        COVER_GENERATED=true
    fi
fi

if [ "$COVER_GENERATED" = false ]; then
    if pnpm exec remotion still Cover-Still "$COVER_PNG_OUTPUT" 2>/dev/null; then
        echo -e "${GREEN}✅ Cover PNG: $COVER_PNG_OUTPUT${NC}"
        COVER_GENERATED=true
    fi
fi

if [ "$COVER_GENERATED" = true ] && command -v ffmpeg &> /dev/null; then
    if ffmpeg -i "$COVER_PNG_OUTPUT" -frames:v 1 -update 1 -q:v 2 "$COVER_OUTPUT" -y -loglevel warning 2>&1; then
        echo -e "${GREEN}✅ Cover JPG: $COVER_OUTPUT${NC}"
    fi
fi

if [ "$COVER_GENERATED" = false ]; then
    echo -e "${YELLOW}⚠️  Remotion still failed, trying ffmpeg from first frame...${NC}"
    if command -v ffmpeg &> /dev/null; then
        if ffmpeg -i "$OUTPUT_FILE" -vf "select=eq(n\,0)" -vframes 1 "$COVER_OUTPUT" -y -loglevel warning 2>&1; then
            echo -e "${GREEN}✅ Cover JPG: $COVER_OUTPUT${NC}"
            COVER_GENERATED=true
        fi
    fi
fi

if [ -n "$PROPS_FILE" ] && [ -f "$PROPS_FILE" ]; then
    rm -f "$PROPS_FILE"
fi

echo ""
echo -e "${GREEN}✅ Render done: $OUTPUT_FILE${NC}"
