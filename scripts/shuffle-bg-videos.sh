#!/usr/bin/env bash
# Randomly permute public/video/0.mp4..3.mp4 so a different clip lands at each index.
# Video composition always loads 0.mp4 — not run by render pipelines; use locally before render if you want variety.
# Skips (exit 0) if any of the four files is missing.

set -e

YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

VIDEO_DIR="${VIDEO_DIR:-public/video}"

for i in 0 1 2 3; do
	if [[ ! -f "$VIDEO_DIR/$i.mp4" ]]; then
		echo -e "${YELLOW}⚠️  shuffle-bg-videos: missing $VIDEO_DIR/$i.mp4 — skip${NC}"
		exit 0
	fi
done

for i in 0 1 2 3; do
	mv "$VIDEO_DIR/$i.mp4" "$VIDEO_DIR/.bg-shuffle-tmp-$i.mp4"
done

indices=(0 1 2 3)
for ((i = 4; i > 0; i--)); do
	j=$((RANDOM % i))
	tmp=${indices[j]}
	indices[j]=${indices[i - 1]}
	indices[i - 1]=$tmp
done

for k in 0 1 2 3; do
	old=${indices[k]}
	mv "$VIDEO_DIR/.bg-shuffle-tmp-${old}.mp4" "$VIDEO_DIR/${k}.mp4"
done

echo -e "${BLUE}🎬 BG videos shuffled (Video uses 0.mp4 = former ${indices[0]}.mp4 content)${NC}"
