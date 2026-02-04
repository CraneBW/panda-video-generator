/**
 * File path constants for the project
 * Centralized path management for better maintainability
 */

// Output directories
export const OUTPUT_DIRS = {
  TTS: 'output/tts',
  SPIDER: 'output/spider',
  VIDEO: 'output/video',
} as const;

// Public directories (for Remotion access)
export const PUBLIC_DIRS = {
  TTS: 'public/tts',
  VIDEO: 'public/video',
  AUDIO: 'public/audio',
  OUT: 'public/out',
} as const;

// TTS file paths
export const TTS_PATHS = {
  INPUT: `${OUTPUT_DIRS.TTS}/input.txt`,
  AUDIO_MP3: `${OUTPUT_DIRS.TTS}/audio.mp3`,
  AUDIO_VTT: `${OUTPUT_DIRS.TTS}/audio.vtt`,
  // Public paths for Remotion
  PUBLIC_AUDIO_MP3: `${PUBLIC_DIRS.TTS}/audio.mp3`,
  PUBLIC_AUDIO_VTT: `${PUBLIC_DIRS.TTS}/audio.vtt`,
} as const;

// Spider file paths
export const SPIDER_PATHS = {
  OUTPUT_DIR: OUTPUT_DIRS.SPIDER,
  DEBUG_DIR: OUTPUT_DIRS.SPIDER,
} as const;

// Video file paths
export const VIDEO_PATHS = {
  VIDEO_MP4: `${OUTPUT_DIRS.VIDEO}/video.mp4`,
  TITLE_JSON: `${OUTPUT_DIRS.VIDEO}/title.json`,
  // Public paths for Remotion
  PUBLIC_TITLE_JSON: `${PUBLIC_DIRS.VIDEO}/title.json`,
} as const;

// Remotion static file paths (relative to public directory)
export const REMOTION_PATHS = {
  TTS_AUDIO: 'tts/audio.mp3',
  TTS_VTT: 'tts/audio.vtt',
  VIDEO_TITLE_JSON: 'video/title.json',
  AUDIO_INTRO: 'audio/intro.mp3',
  AUDIO_INTRO_TYPEWRITER: 'audio/intro_typewriter.mp3',
} as const;

// Automation upload paths
export const UPLOAD_PATHS = {
  DEFAULT_VIDEO: VIDEO_PATHS.VIDEO_MP4,
  DEFAULT_TITLE_JSON: VIDEO_PATHS.TITLE_JSON,
} as const;
