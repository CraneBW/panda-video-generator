#!/bin/bash

# Auto Video Generator Script
# Usage: ./generate-video.sh <zhihu_url>
# Example: ./generate-video.sh https://www.zhihu.com/question/316150890

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a Zhihu question URL${NC}"
    echo "Usage: ./generate-video.sh <zhihu_url>"
    echo "Example: ./generate-video.sh https://www.zhihu.com/question/316150890"
    exit 1
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

# Step 1: Run Spider
echo -e "${YELLOW}📝 Step 1/3: Extracting content from Zhihu...${NC}"
echo "URL: $ZHIHU_URL"
echo ""

if ! pnpm spider "$ZHIHU_URL"; then
    echo -e "${RED}❌ Failed to extract content from Zhihu${NC}"
    exit 1
fi

echo ""

# Check if spider extracted content successfully
if [ ! -f "input/input.txt" ]; then
    echo -e "${RED}❌ Error: Caption file not found at input/input.txt${NC}"
    echo -e "${YELLOW}This usually means:${NC}"
    echo "  1. Spider failed to extract content from Zhihu"
    echo "  2. The page may require login or has anti-bot protection"
    echo "  3. The URL may be invalid or the page structure changed"
    echo ""
    echo -e "${BLUE}Checking spider output files...${NC}"
    ls -la spider/output-*.json 2>/dev/null | tail -1 || echo "No spider output files found"
    exit 1
fi

echo -e "${GREEN}✅ Step 1 completed: Content extracted and caption generated${NC}"
echo ""

# Step 2: Run TTS
echo -e "${YELLOW}🎙️  Step 2/3: Generating audio with TTS...${NC}"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: python3 is not installed${NC}"
    exit 1
fi

# Setup virtual environment
VENV_DIR="tts/venv"
VENV_PYTHON="$VENV_DIR/bin/python"

echo -e "${BLUE}Setting up TTS virtual environment...${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating virtual environment at $VENV_DIR...${NC}"
    python3 -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Check if virtual environment Python exists
if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${RED}❌ Error: Virtual environment Python not found at $VENV_PYTHON${NC}"
    exit 1
fi

# Check if TTS dependencies are installed in venv
echo -e "${BLUE}Checking TTS dependencies in virtual environment...${NC}"
MISSING_DEPS=()

if ! "$VENV_PYTHON" -c "import edge_tts" 2>/dev/null; then
    MISSING_DEPS+=("edge-tts")
fi

if ! "$VENV_PYTHON" -c "import pydub" 2>/dev/null; then
    MISSING_DEPS+=("pydub")
fi

# Install missing dependencies
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Installing missing dependencies: ${MISSING_DEPS[*]}...${NC}"
    "$VENV_PYTHON" -m pip install --quiet --upgrade pip
    "$VENV_PYTHON" -m pip install --quiet -r tts/requirements.txt
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install TTS dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ All TTS dependencies are installed${NC}"
fi

echo ""

# Run TTS using virtual environment Python
if ! "$VENV_PYTHON" tts/tts.py input/input.txt public/audio; then
    echo -e "${RED}❌ Failed to generate audio${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Step 2 completed: Audio and VTT files generated${NC}"
echo ""

# Check if audio files were created
if [ ! -f "public/audio/audio.mp3" ] || [ ! -f "public/audio/audio.vtt" ]; then
    echo -e "${RED}❌ Error: Audio files not found${NC}"
    exit 1
fi

# Step 3: Render Video
echo -e "${YELLOW}🎬 Step 3/3: Rendering video with Remotion...${NC}"
echo ""

# Generate output filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="out/video_${TIMESTAMP}.mp4"

# Ensure out directory exists
mkdir -p out

if ! pnpm render TextToSpeechDisplay "$OUTPUT_FILE"; then
    echo -e "${RED}❌ Failed to render video${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All steps completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📁 Output files:${NC}"
echo "  - Video: $OUTPUT_FILE"
echo "  - Audio: public/audio/audio.mp3"
echo "  - Subtitles: public/audio/audio.vtt"
echo "  - Caption: input/input.txt"
echo ""
