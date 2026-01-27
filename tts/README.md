# TTS Tool

Text-to-speech tool using Edge-TTS (Microsoft Edge Text-to-Speech).

## Setup

```bash
# Create virtual environment
python3 -m venv tts/venv

# Activate virtual environment
source tts/venv/bin/activate  # macOS/Linux
# or
tts\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r tts/requirements.txt
```

## Usage

```bash
source tts/venv/bin/activate
python tts/tts.py caption/test.txt public/audio
```

## Output

Generates in the output directory:
- `audio.mp3` - Merged audio file
- `audio.vtt` - VTT subtitle file with timestamps

Temporary sentence files are automatically deleted after merging.
