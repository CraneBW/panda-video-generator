#!/bin/bash

# Zhihu Spider Script
# Extracts content from Zhihu question and generates video script
# Usage: ./spider-zhihu.sh <zhihu_url>
# Example: ./spider-zhihu.sh https://www.zhihu.com/question/316150890

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
    echo "Usage: ./spider-zhihu.sh <zhihu_url>"
    echo "Example: ./spider-zhihu.sh https://www.zhihu.com/question/316150890"
    exit 1
fi

# Skip leading -- if present (often passed by pnpm/npm)
if [ "$1" == "--" ]; then
    shift
fi

ZHIHU_URL="$1"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🕷️  Zhihu Content Spider${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run spider directly with tsx
if ! pnpm exec tsx spider/spider-zhihu.ts "$ZHIHU_URL"; then
    echo -e "${RED}❌ Failed to extract content from Zhihu${NC}"
    exit 1
fi

echo ""
