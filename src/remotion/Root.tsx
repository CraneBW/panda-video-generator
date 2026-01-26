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
import { NextLogo } from "./MyComp/NextLogo";
import { TerminalWindow } from "./MyComp/TerminalWindow";
import { TextToSpeechDisplay } from "./MyComp/TextToSpeechDisplay";

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
        id="NextLogo123"
        component={NextLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{
          outProgress: 0,
        }}
      />
      {/* <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{
          outProgress: 0,
        }}
      /> */}
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
        durationInFrames={Math.ceil(28.928 * VIDEO_FPS)} // 基于 audio.vtt 的总时长 (28.928秒)
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{
          audioFile: 'audio/audio.mp3',
          vttFile: 'audio/audio.vtt',
        }}
      />
    </>
  );
};
