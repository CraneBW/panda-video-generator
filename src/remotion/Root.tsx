import React from "react";
import { Composition } from "remotion";
import { Main } from "./MyComp/Main";
import {
  COMP_NAME,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../../types/constants";
import { TerminalWindow } from "./MyComp/TerminalWindow";
import { TextToSpeechDisplay } from "./MyComp/TextToSpeechDisplay";
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
        component={Main}
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
        id="TextToSpeechDisplay"
        component={TextToSpeechDisplay}
        calculateMetadata={async ({ props }: { props: { audioFile?: string; vttFile?: string } }) => {
          // Get audio duration automatically from VTT file
          const vttFile = props.vttFile || "audio/audio.vtt";
          const durationInSeconds = await getAudioDurationFromVtt(vttFile);
          const durationInFrames = Math.ceil(durationInSeconds * VIDEO_FPS);

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
        }}
      />
    </>
  );
};
