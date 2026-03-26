#!/bin/bash

# Auto Video Generator Script
# Combines spider-zhihu.sh and full render pipeline (tts + render-video-only via render-video.sh)
# Usage: ./generate-video.sh <zhihu_url>
# Example: ./generate-video.sh https://www.zhihu.com/question/316150890

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a Zhihu question URL${NC}"
    echo "Usage: ./generate-video.sh <zhihu_url>"
    echo "Example: ./generate-video.sh https://www.zhihu.com/question/316150890"
    exit 1
fi

# Skip leading -- if present (often passed by pnpm/npm)
if [ "$1" == "--" ]; then
    shift
fi

ZHIHU_URL="$1"

# Validate URL
if [[ ! "$ZHIHU_URL" =~ ^https://www\.zhihu\.com/question/ ]]; then
    echo -e "${RED}❌ Error: Invalid Zhihu URL format${NC}"
    echo "Expected format: https://www.zhihu.com/question/<question_id>"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎬 Auto Video Generator${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Change to project root directory
cd "$PROJECT_ROOT"

# Step 1: Run Spider
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

# Step 2: Render Video
echo -e "${YELLOW}🎬 Step 2/2: Rendering video...${NC}"
echo ""

if ! bash "$SCRIPT_DIR/render-video.sh"; then
    echo -e "${RED}❌ Failed to render video${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All steps completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}📁 Final output files:${NC}"
echo "  - Video: output/video/video.mp4"
echo "  - Audio: output/tts/audio.mp3"
echo "  - Subtitles: output/tts/audio.vtt"
echo "  - Caption: output/tts/input.txt"
if [ -f "output/video/title.json" ]; then
    echo "  - Title JSON: output/video/title.json"
fi
echo ""
