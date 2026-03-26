#!/bin/bash

# TTS only: output/tts/input.txt -> audio.mp3 + audio.vtt, copy to public/tts/
# Usage: ./scripts/tts.sh (from repo root)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎙️  TTS (Edge-TTS)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f "output/tts/input.txt" ]; then
    echo -e "${RED}❌ Error: Input file not found at output/tts/input.txt${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Error: python3 is not installed${NC}"
    exit 1
fi

VENV_DIR="tts/venv"
VENV_PYTHON="$VENV_DIR/bin/python"

echo -e "${BLUE}Setting up TTS virtual environment...${NC}"

if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating virtual environment at $VENV_DIR...${NC}"
    python3 -m venv "$VENV_DIR"
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${RED}❌ Error: Virtual environment Python not found at $VENV_PYTHON${NC}"
    exit 1
fi

MISSING_DEPS=()
if ! "$VENV_PYTHON" -c "import edge_tts" 2>/dev/null; then
    MISSING_DEPS+=("edge-tts")
fi
if ! "$VENV_PYTHON" -c "import pydub" 2>/dev/null; then
    MISSING_DEPS+=("pydub")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Installing missing dependencies: ${MISSING_DEPS[*]}...${NC}"
    "$VENV_PYTHON" -m pip install --quiet --upgrade pip
    "$VENV_PYTHON" -m pip install --quiet -r tts/requirements.txt
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ All TTS dependencies are installed${NC}"
fi

echo ""

if ! "$VENV_PYTHON" tts/tts.py output/tts/input.txt output/tts; then
    echo -e "${RED}❌ Failed to generate audio${NC}"
    exit 1
fi

if [ ! -f "output/tts/audio.mp3" ] || [ ! -f "output/tts/audio.vtt" ]; then
    echo -e "${RED}❌ Error: Audio files not found${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Copying TTS files to public/tts/...${NC}"
mkdir -p public/tts
rm -f public/tts/audio.mp3 public/tts/audio.vtt
cp output/tts/audio.mp3 public/tts/audio.mp3
cp output/tts/audio.vtt public/tts/audio.vtt

echo ""
echo -e "${GREEN}✅ TTS done: output/tts/audio.mp3, audio.vtt → public/tts/${NC}"
