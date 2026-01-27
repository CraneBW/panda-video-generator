#!/usr/bin/env python3
"""
Simple TTS tool using Edge-TTS (Microsoft Edge Text-to-Speech)

Install dependencies:
    pip install edge-tts pydub

Usage:
    python tts/tts.py input.txt output_dir
    python tts/tts.py caption/test.txt public/audio

Environment variables (optional):
    EDGE_TTS_VOICE - Voice name (default: 'zh-CN-XiaoxiaoNeural')
    List available voices: edge-tts --list-voices
"""

import sys
import os
from pathlib import Path
import subprocess
import asyncio

def check_dependencies():
    """Check if Edge-TTS is installed"""
    try:
        import edge_tts
        return True
    except ImportError:
        return False

def get_audio_duration(audio_path):
    """Get audio file duration in seconds"""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_mp3(audio_path)
        return len(audio) / 1000.0  # Convert to seconds
    except ImportError:
        # If pydub is not available, try using ffprobe
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', 
                 '-of', 'default=noprint_wrappers=1:nokey=1', audio_path],
                capture_output=True,
                text=True
            )
            return float(result.stdout.strip())
        except:
            # If both are unavailable, estimate duration (approx 3.5 chars/sec for Chinese)
            return len(open(audio_path, 'rb').read()) / 16000  # Rough estimate

async def tts_with_edge(text, output_path, voice_name=None, max_retries=3):
    """Use Edge-TTS (online, free, no API key required)"""
    import edge_tts
    import time
    
    # Default voice for Chinese
    if not voice_name:
        voice_name = os.getenv('EDGE_TTS_VOICE', 'zh-CN-XiaoxiaoNeural')
    
    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(text, voice_name)
            await communicate.save(output_path)
            
            # Verify file was created
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise Exception("Generated audio file is empty or not created")
            return True
        except Exception as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # Exponential backoff: 2s, 4s, 6s
                print(f"  ⚠️  Retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                print(f"  Error: {str(e)}")
                await asyncio.sleep(wait_time)
            else:
                raise e
    return False

def format_time(seconds):
    """Convert seconds to VTT time format (HH:MM:SS.mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

def merge_audio_files(audio_files, output_path, speed=1.0):
    """Merge multiple audio files and adjust speed"""
    try:
        from pydub import AudioSegment
        
        combined = AudioSegment.empty()
        for audio_file in audio_files:
            audio = AudioSegment.from_mp3(audio_file)
            combined += audio
        
        # Adjust speed
        if speed != 1.0:
            combined = combined.speedup(playback_speed=speed)
        
        combined.export(output_path, format="mp3")
        return True
    except ImportError:
        # If pydub is not available, use ffmpeg
        try:
            # Create file list
            file_list_path = output_path + '.txt'
            with open(file_list_path, 'w') as f:
                for audio_file in audio_files:
                    f.write(f"file '{os.path.abspath(audio_file)}'\n")
            
            # Merge using ffmpeg
            subprocess.run([
                'ffmpeg', '-f', 'concat', '-safe', '0', 
                '-i', file_list_path, '-c', 'copy', output_path
            ], check=True, capture_output=True)
            
            os.remove(file_list_path)
            return True
        except Exception as e:
            print(f"❌ Failed to merge audio: {e}")
            return False

def generate_vtt(lines, durations, output_path):
    """Generate VTT subtitle file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("WEBVTT\n\n")
        
        current_time = 0.0
        for i, (text, duration) in enumerate(zip(lines, durations), 1):
            start_time = current_time
            end_time = current_time + duration
            
            f.write(f"{i}\n")
            f.write(f"{format_time(start_time)} --> {format_time(end_time)}\n")
            f.write(f"{text}\n\n")
            
            current_time = end_time

def split_by_punctuation(text, max_length=2000):
    """Split text by Chinese and English punctuation marks
    If a sentence exceeds max_length characters, split it further at punctuation marks
    """
    # All punctuation marks: 。，、；：？！.?,;:!?
    punctuation_marks = '。，、；：？！.?,;:!?'
    
    sentences = []
    current_sentence = ''
    
    for char in text:
        # Add character to current sentence
        test_sentence = current_sentence + char
        test_stripped = test_sentence.strip()
        
        # Check if adding this char would exceed max_length
        if len(test_stripped) > max_length:
            # Need to split before adding this char
            if current_sentence.strip():
                temp = current_sentence.strip()
                # Find the last punctuation mark before max_length
                split_pos = -1
                for j in range(min(max_length, len(temp)), 0, -1):
                    if temp[j-1] in punctuation_marks:
                        split_pos = j
                        break
                
                if split_pos > 0:
                    # Split at punctuation
                    sentences.append(temp[:split_pos].strip())
                    current_sentence = temp[split_pos:] + char
                else:
                    # No punctuation found, force split at max_length
                    sentences.append(temp[:max_length].strip())
                    current_sentence = temp[max_length:] + char
            else:
                # Current sentence is empty or whitespace, just add char
                current_sentence += char
        else:
            # Safe to add char
            current_sentence += char
            
            # If we hit a sentence-ending punctuation, finalize
            if char in '。！？.':
                if current_sentence.strip():
                    sentences.append(current_sentence.strip())
                current_sentence = ''
    
    # Handle remaining text
    if current_sentence.strip():
        remaining = current_sentence.strip()
        while len(remaining) > max_length:
            # Find punctuation in remaining text
            split_pos = -1
            for j in range(min(max_length, len(remaining)), 0, -1):
                if remaining[j-1] in punctuation_marks:
                    split_pos = j
                    break
            
            if split_pos > 0:
                sentences.append(remaining[:split_pos].strip())
                remaining = remaining[split_pos:]
            else:
                sentences.append(remaining[:max_length].strip())
                remaining = remaining[max_length:]
        
        if remaining.strip():
            sentences.append(remaining.strip())
    
    return [s for s in sentences if s]

async def process_file_async(input_file, output_dir='public/audio'):
    """Process subtitle file (async version)"""
    # Check dependencies
    if not check_dependencies():
        print("❌ Edge-TTS library not found")
        print("Please install: pip install edge-tts pydub")
        return False
    
    # Read input file
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        return False
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by punctuation marks
    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if line:
            # Split each line by punctuation
            sentences = split_by_punctuation(line)
            lines.extend(sentences)
    
    if not lines:
        print("❌ File is empty")
        return False
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    voice_name = os.getenv('EDGE_TTS_VOICE', 'zh-CN-XiaoxiaoNeural')
    print(f"🎙️  Using Edge-TTS to generate audio")
    print(f"🔊 Voice: {voice_name}")
    print(f"📝 Found {len(lines)} lines of text\n")
    
    # Generate temporary audio files
    temp_audio_files = []
    durations = []
    
    for i, text in enumerate(lines, 1):
        print(f"[{i}/{len(lines)}] Generating: {text[:30]}...")
        print(f"    Text length: {len(text)} characters")
        
        temp_path = os.path.join(output_dir, f"sentence{i}.mp3")
        
        try:
            await tts_with_edge(text, temp_path, voice_name)
            
            # Get audio duration
            duration = get_audio_duration(temp_path)
            durations.append(duration)
            temp_audio_files.append(temp_path)
            
            print(f"✅ Saved: {temp_path} (duration: {duration:.2f}s)\n")
        except Exception as e:
            print(f"❌ Failed: {e}\n")
            print(f"    Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return False
    
    # Merge audio files and adjust speed to 1.2x
    SPEED_FACTOR = 1.2
    print(f"🔗 Merging audio files and adjusting speed to {SPEED_FACTOR}x...")
    merged_audio_path = os.path.join(output_dir, 'audio.mp3')
    if merge_audio_files(temp_audio_files, merged_audio_path, speed=SPEED_FACTOR):
        print(f"✅ Merge completed: {merged_audio_path}\n")
    else:
        print("❌ Merge failed")
        return False
    
    # Adjust durations (because speed is increased, actual duration will be shorter)
    adjusted_durations = [d / SPEED_FACTOR for d in durations]
    
    # Generate VTT file (using adjusted durations)
    print("📝 Generating VTT subtitle file...")
    vtt_path = os.path.join(output_dir, 'audio.vtt')
    generate_vtt(lines, adjusted_durations, vtt_path)
    print(f"✅ VTT file saved: {vtt_path}\n")
    
    # Delete temporary files
    print("🗑️  Deleting temporary files...")
    for temp_file in temp_audio_files:
        try:
            os.remove(temp_file)
            print(f"  Deleted: {os.path.basename(temp_file)}")
        except Exception as e:
            print(f"  Warning: Unable to delete {temp_file}: {e}")
    
    total_duration = sum(adjusted_durations)
    print(f"\n✅ Complete!")
    print(f"   - Merged audio: {merged_audio_path}")
    print(f"   - VTT subtitles: {vtt_path}")
    print(f"   - Total duration: {total_duration:.2f}s (speeded up {SPEED_FACTOR}x)")
    
    return True

def process_file(input_file, output_dir='public/audio'):
    """Process subtitle file (wrapper for async function)"""
    return asyncio.run(process_file_async(input_file, output_dir))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python tts/tts.py <input_file> [output_dir]")
        print("Example: python tts/tts.py caption/test.txt public/audio")
        print("\nOptional environment variable:")
        print("  EDGE_TTS_VOICE - Voice name (default: 'zh-CN-XiaoxiaoNeural')")
        print("  List available voices: edge-tts --list-voices")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'public/audio'
    
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)
    
    process_file(input_file, output_dir)
