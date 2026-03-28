#!/bin/bash

# Composed pipeline: Zhihu URL → spider/prep → TTS → Remotion (via pipeline-tts-then-render.sh).
# Usage: ./scripts/pipeline-zhihu-to-video.sh <zhihu_url>
# Example: ./scripts/pipeline-zhihu-to-video.sh https://www.zhihu.com/question/316150890

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$1" ]; then
	echo -e "${RED}❌ Error: Please provide a Zhihu question URL${NC}"
	echo "Usage: ./scripts/pipeline-zhihu-to-video.sh <zhihu_url>"
	echo "Example: ./scripts/pipeline-zhihu-to-video.sh https://www.zhihu.com/question/316150890"
	exit 1
fi

if [ "$1" == "--" ]; then
	shift
fi

ZHIHU_URL="$1"

if [[ ! "$ZHIHU_URL" =~ ^https://www\.zhihu\.com/question/ ]]; then
	echo -e "${RED}❌ Error: Invalid Zhihu URL format${NC}"
	echo "Expected format: https://www.zhihu.com/question/<question_id>"
	exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎬 Pipeline: Zhihu → video${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT"

echo -e "${YELLOW}📝 Step 1/2: Extracting content from Zhihu...${NC}"
echo "URL: $ZHIHU_URL"
echo ""

if ! bash "$SCRIPT_DIR/spider-zhihu.sh" "$ZHIHU_URL"; then
	echo -e "${RED}❌ Failed to extract content from Zhihu${NC}"
	exit 1
fi

echo ""
echo -e "${GREEN}✅ Step 1 completed: Content extracted and caption generated${NC}"
echo ""

echo -e "${YELLOW}🎬 Step 2/2: TTS + Remotion render...${NC}"
echo ""

if ! bash "$SCRIPT_DIR/pipeline-tts-then-render.sh"; then
	echo -e "${RED}❌ Failed to render video${NC}"
	exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All steps completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TTS_OUTPUT_DIR="${TTS_OUTPUT_DIR:-output/tts}"
TTS_INPUT_FILE="${TTS_INPUT_FILE:-$TTS_OUTPUT_DIR/input.txt}"
SPIDER_OUTPUT_DIR="${SPIDER_OUTPUT_DIR:-output/spider}"
TITLE_JSON="$SPIDER_OUTPUT_DIR/title.json"

echo -e "${BLUE}📁 Final output files:${NC}"
echo "  - Video: output/video/video.mp4"
echo "  - Audio: $TTS_OUTPUT_DIR/audio.mp3"
echo "  - Subtitles: $TTS_OUTPUT_DIR/audio.vtt"
echo "  - Caption: $TTS_INPUT_FILE"
if [ -f "$TITLE_JSON" ]; then
	echo "  - Title JSON: $TITLE_JSON"
fi
echo ""
