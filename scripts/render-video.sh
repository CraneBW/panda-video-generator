#!/bin/bash

# Full pipeline: TTS then Remotion (orchestrator).
# Usage: ./scripts/render-video.sh (from repo root)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\033[0;34m━━ Full pipeline: TTS → Remotion ━━\033[0m"
bash "$SCRIPT_DIR/tts.sh"
bash "$SCRIPT_DIR/render-video-only.sh"
