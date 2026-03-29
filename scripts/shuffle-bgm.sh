#!/usr/bin/env bash
# Randomly permute public/bgm/0.mp3..(N-1).mp3 so a different track lands at each index.
# Content composition always loads bgm/0.mp3 — not run by render pipelines; use locally before render if you want variety.
# Skips (exit 0) if any expected file is missing.

set -e

YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BGM_DIR="${BGM_DIR:-public/bgm}"
BGM_COUNT="${BGM_COUNT:-14}"

for ((i = 0; i < BGM_COUNT; i++)); do
	if [[ ! -f "$BGM_DIR/$i.mp3" ]]; then
		echo -e "${YELLOW}⚠️  shuffle-bgm: missing $BGM_DIR/$i.mp3 — skip${NC}"
		exit 0
	fi
done

for ((i = 0; i < BGM_COUNT; i++)); do
	mv "$BGM_DIR/$i.mp3" "$BGM_DIR/.bgm-shuffle-tmp-$i.mp3"
done

indices=()
for ((i = 0; i < BGM_COUNT; i++)); do
	indices+=("$i")
done

for ((i = BGM_COUNT; i > 0; i--)); do
	j=$((RANDOM % i))
	tmp=${indices[j]}
	indices[j]=${indices[i - 1]}
	indices[i - 1]=$tmp
done

for ((k = 0; k < BGM_COUNT; k++)); do
	old=${indices[k]}
	mv "$BGM_DIR/.bgm-shuffle-tmp-${old}.mp3" "$BGM_DIR/${k}.mp3"
done

echo -e "${BLUE}🎵 BGM shuffled (Content uses 0.mp3 = former ${indices[0]}.mp3)${NC}"
