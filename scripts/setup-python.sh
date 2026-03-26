#!/bin/bash

# Setup Python virtual environment and install dependencies
# This script is called automatically after npm/pnpm install

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🐍 Setting up Python environment...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: python3 is not installed${NC}"
    echo "Python dependencies will be installed when you run pnpm tts or pnpm render:all"
    exit 0  # Don't fail the npm install
fi

# Setup virtual environment
VENV_DIR="tts/venv"
VENV_PYTHON="$VENV_DIR/bin/python"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python virtual environment at $VENV_DIR...${NC}"
    python3 -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠️  Failed to create virtual environment${NC}"
        echo "Python dependencies will be installed when you run pnpm tts or pnpm render:all"
        exit 0  # Don't fail the npm install
    fi
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Check if virtual environment Python exists
if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${YELLOW}⚠️  Warning: Virtual environment Python not found${NC}"
    exit 0  # Don't fail the npm install
fi

# Install Python dependencies
if [ -f "tts/requirements.txt" ]; then
    echo -e "${BLUE}Installing Python dependencies from tts/requirements.txt...${NC}"
    "$VENV_PYTHON" -m pip install --quiet --upgrade pip
    "$VENV_PYTHON" -m pip install --quiet -r tts/requirements.txt
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Python dependencies installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: Failed to install Python dependencies${NC}"
        echo "You can install them manually later or they will be installed when you run pnpm tts"
        exit 0  # Don't fail the npm install
    fi
else
    echo -e "${YELLOW}⚠️  Warning: tts/requirements.txt not found${NC}"
    exit 0  # Don't fail the npm install
fi

echo ""
