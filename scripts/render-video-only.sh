#!/bin/bash

# Remotion render + cover only. Requires existing output/tts/audio.mp3 & audio.vtt (run scripts/tts.sh first).
# Usage: ./scripts/render-video-only.sh (from repo root)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎬 Remotion video + cover${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f "output/tts/audio.mp3" ] || [ ! -f "output/tts/audio.vtt" ]; then
    echo -e "${RED}❌ Missing output/tts/audio.mp3 or audio.vtt — run: pnpm tts${NC}"
    exit 1
fi

mkdir -p public/tts
rm -f public/tts/audio.mp3 public/tts/audio.vtt
cp output/tts/audio.mp3 public/tts/audio.mp3
cp output/tts/audio.vtt public/tts/audio.vtt
echo -e "${GREEN}✅ TTS assets synced to public/tts/${NC}"
echo ""

OUTPUT_FILE="output/video/video.mp4"
mkdir -p output/video

if [ -f "output/video/title.json" ]; then
    mkdir -p public/video
    rm -f "public/video/title.json"
    cp "output/video/title.json" "public/video/title.json"
    echo -e "${BLUE}📋 Title JSON → public/video/title.json${NC}"
    echo -e "${BLUE}   Title: $(node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('output/video/title.json','utf8')); console.log(d.title)")${NC}"
else
    echo -e "${YELLOW}⚠️  output/video/title.json not found, using default title${NC}"
fi

PROPS_FILE=""
if [ -f "output/video/title.json" ]; then
    PROPS_FILE="output/video/render-props.json"
    node -e "
        const fs = require('fs');
        try {
            const data = JSON.parse(fs.readFileSync('output/video/title.json', 'utf8'));
            if (data.title) {
                const props = JSON.stringify({ title: data.title }, null, 2);
                fs.writeFileSync('$PROPS_FILE', props, 'utf8');
            }
        } catch (e) {}
    "
fi

BGM_INDEX=$((RANDOM % 14))
export REMOTION_BGM_INDEX=$BGM_INDEX
BG_VIDEO_INDEX=$((RANDOM % 4))
export REMOTION_BG_VIDEO_INDEX=$BG_VIDEO_INDEX
echo -e "${BLUE}🎵 BGM index: $BGM_INDEX | 🎬 BG video: $BG_VIDEO_INDEX${NC}"

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
