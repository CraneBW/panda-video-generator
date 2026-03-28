#!/bin/bash

# Composed pipeline: TTS (plus sync to public) → Remotion render + cover.
# Usage: ./scripts/pipeline-tts-then-render.sh (from repo root)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\033[0;34m━━ Pipeline: TTS → Remotion ━━\033[0m"
bash "$SCRIPT_DIR/tts.sh"
bash "$SCRIPT_DIR/render-video-only.sh"
