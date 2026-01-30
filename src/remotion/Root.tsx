import React from "react";
import { Composition } from "remotion";
import { Intro } from "./compositions/Intro";
import {
  COMP_NAME,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";
import { TerminalWindow } from "./compositions/TerminalWindow";
import { Content } from "./compositions/Content";
import { Video } from "./compositions/Video";
import { staticFile } from "remotion";

// Parse VTT file to get the last caption's end time (duration)
async function getAudioDurationFromVtt(vttFile: string): Promise<number> {
  try {
    const response = await fetch(staticFile(vttFile));
    const vttContent = await response.text();
    const lines = vttContent.split('\n');

    let maxEndMs = 0;
    for (const line of lines) {
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (timeMatch) {
        const endMs =
          parseInt(timeMatch[5]) * 3600000 +
          parseInt(timeMatch[6]) * 60000 +
          parseInt(timeMatch[7]) * 1000 +
          parseInt(timeMatch[8]);
        maxEndMs = Math.max(maxEndMs, endMs);
      }
    }

    return maxEndMs / 1000; // Convert to seconds
  } catch (e) {
    console.error('Failed to parse VTT file for duration:', e);
    return 0;
  }
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={COMP_NAME}
        component={Intro}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultMyCompProps}
      />

      <Composition
        id="TerminalWindow"
        component={TerminalWindow}
        durationInFrames={340}
        fps={30}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="Video"
        component={Video}
        calculateMetadata={async ({ props }: { props: { title?: string; audioFile?: string; vttFile?: string } }) => {
          // Get audio duration automatically from VTT file
          const vttFile = props.vttFile || "audio/audio.vtt";
          const audioDurationInSeconds = await getAudioDurationFromVtt(vttFile);
          // Sequence 1: Intro (1.5 seconds) + Sequence 2: Third Title (3 seconds) + Sequence 3: Content (audio duration)
          const SEQ1_DURATION_SECONDS = 1.5;
          const SEQ2_DURATION_SECONDS = 3;
          const totalDurationInSeconds = SEQ1_DURATION_SECONDS + SEQ2_DURATION_SECONDS + audioDurationInSeconds;
          const durationInFrames = Math.ceil(totalDurationInSeconds * VIDEO_FPS);

          return {
            durationInFrames,
            fps: VIDEO_FPS,
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
          };
        }}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          title: defaultMyCompProps.title,
          audioFile: "audio/audio.mp3",
          vttFile: "audio/audio.vtt",
        }}
      />
      <Composition
        id="Content"
        component={Content}
        calculateMetadata={async ({ props }: { props: { audioFile?: string; vttFile?: string; title?: string; coverImage?: string; coverBackgroundColor?: string; coverGradientColors?: string[]; coverGradientDirection?: 'horizontal' | 'vertical' | 'diagonal' } }) => {
          // Get audio duration automatically from VTT file
          const vttFile = props.vttFile || "audio/audio.vtt";
          const audioDurationInSeconds = await getAudioDurationFromVtt(vttFile);
          // Add delay for Intro animation and title/cover display (2.75 seconds)
          const TITLE_DELAY_SECONDS = 2.75;
          const totalDurationInSeconds = audioDurationInSeconds + TITLE_DELAY_SECONDS;
          const durationInFrames = Math.ceil(totalDurationInSeconds * VIDEO_FPS);

          return {
            durationInFrames,
            fps: VIDEO_FPS,
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
          };
        }}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          audioFile: "audio/audio.mp3",
          vttFile: "audio/audio.vtt",
          title: undefined,
          coverImage: undefined,
          coverBackgroundColor: undefined,
          coverGradientColors: undefined,
          coverGradientDirection: undefined,
        }}
      />
    </>
  );
};
