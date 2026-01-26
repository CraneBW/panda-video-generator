#!/usr/bin/env python3
"""
Simple TTS tool
Converts text to audio using pyttsx3 (offline) or gTTS (online)

Install dependencies:
    pip install pyttsx3 gtts pydub

Usage:
    python tts/tts.py input.txt output_dir
    python tts/tts.py caption/dj-okawari-intro.txt public/audio
"""

import sys
import os
from pathlib import Path
import subprocess

def check_dependencies():
    """Check if dependencies are installed"""
    try:
        import pyttsx3
        return 'pyttsx3'
    except ImportError:
        try:
            from gtts import gTTS
            return 'gtts'
        except ImportError:
            return None

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

def tts_with_pyttsx3(text, output_path, lang='zh'):
    """Use pyttsx3 (offline)"""
    import pyttsx3
    
    engine = pyttsx3.init()
    
    # Set language and voice
    voices = engine.getProperty('voices')
    for voice in voices:
        if lang in voice.id.lower():
            engine.setProperty('voice', voice.id)
            break
    
    # Set speech rate and volume
    engine.setProperty('rate', 150)  # Speech rate
    engine.setProperty('volume', 1.0)  # Volume
    
    # Save to file
    engine.save_to_file(text, output_path)
    engine.runAndWait()
    
    return True

def tts_with_gtts(text, output_path, lang='zh-cn'):
    """Use gTTS (online, requires internet)"""
    from gtts import gTTS
    
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(output_path)
    
    return True

def format_time(seconds):
    """将秒数转换为 VTT 时间格式 (HH:MM:SS.mmm)"""
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
        
        # Adjust speed (1.5x speed)
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

def process_file(input_file, output_dir='public/audio'):
    """Process subtitle file"""
    # Check dependencies
    tts_method = check_dependencies()
    if not tts_method:
        print("❌ TTS library not found")
        print("Please install: pip install pyttsx3 gtts pydub")
        return False
    
    # Read input file
    if not os.path.exists(input_file):
        print(f"❌ File not found: {input_file}")
        return False
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
    
    if not lines:
        print("❌ File is empty")
        return False
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"🎙️  Using {tts_method} to generate audio")
    print(f"📝 Found {len(lines)} lines of text\n")
    
    # Generate temporary audio files
    temp_audio_files = []
    durations = []
    
    for i, text in enumerate(lines, 1):
        print(f"[{i}/{len(lines)}] Generating: {text[:30]}...")
        
        temp_path = os.path.join(output_dir, f"sentence{i}.mp3")
        
        try:
            if tts_method == 'pyttsx3':
                tts_with_pyttsx3(text, temp_path)
            else:
                tts_with_gtts(text, temp_path)
            
            # Get audio duration
            duration = get_audio_duration(temp_path)
            durations.append(duration)
            temp_audio_files.append(temp_path)
            
            print(f"✅ Saved: {temp_path} (duration: {duration:.2f}s)\n")
        except Exception as e:
            print(f"❌ Failed: {e}\n")
            return False
    
    # Merge audio files and adjust speed to 1.5x
    SPEED_FACTOR = 1.5
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

if __name__ == '__main__':
    input_file = sys.argv[1] if len(sys.argv) > 1 else 'caption/dj-okawari-intro.txt'
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'public/audio'
    
    process_file(input_file, output_dir)
