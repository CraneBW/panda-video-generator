import { z } from "zod";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
  useDelayRender,
} from "remotion";
import { CompositionProps } from "../../../types/constants";
import { Logo } from "./Logo";
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";
import { Rings } from "./Rings";
import { TextFade } from "./TextFade";
import { useState, useEffect, useCallback } from "react";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700"],
});
export const Intro = ({ title }: z.infer<typeof CompositionProps>) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [jsonTitle, setJsonTitle] = useState<string | null>(null);
  const [titleLoaded, setTitleLoaded] = useState(false);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  // Load title from title.json (must be in public/out/title.json)
  const fetchTitleFromJson = useCallback(async () => {
    try {
      // Use staticFile to access files in public directory
      const response = await fetch(staticFile('out/title.json'));
      if (!response.ok) {
        console.warn('title.json not found in public/out/, skipping third title');
        setTitleLoaded(true);
        return;
      }
      const data = await response.json();
      setJsonTitle(data.title || null);
      setTitleLoaded(true);
    } catch (e) {
      console.error('Failed to load title.json:', e);
      setTitleLoaded(true); // Still continue even if failed
    }
  }, []);

  useEffect(() => {
    fetchTitleFromJson();
  }, [fetchTitleFromJson]);

  useEffect(() => {
    if (titleLoaded) {
      continueRender(handle);
    }
  }, [titleLoaded, continueRender, handle]);

  const transitionStart = 1 * fps; // Start transition after 1 second
  const transitionDuration = 0.5 * fps; // Transition duration 0.5 seconds
  const sequenceDuration = transitionStart + transitionDuration; // Total: 1.5 seconds
  const titleFadeOutDuration = 0.5 * fps; // Title fades out in 0.5 seconds
  const titleFadeOutStart = sequenceDuration - titleFadeOutDuration; // Start fade out 0.5s before sequence ends (at 1.0s)
  const thirdTitleStart = sequenceDuration; // Third title starts at 1.5s
  const thirdTitleDuration = 3 * fps; // Third title displays for 3 seconds

  // Watermark component
  const WatermarkText: React.FC = () => {
    const sequenceFrame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Simple fade in animation
    const opacity = interpolate(
      sequenceFrame,
      [0, 30],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    return (
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily,
          fontSize: '30px',
          color: 'rgba(23, 23, 23, 0.8)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          opacity,
        }}
      >
        Powered By 熊猫视频自动化引擎 |
        Github: Panda-Video-Generator
      </div>
    );
  };

  // Inner component for Sequence to use relative frame
  const TitleSequence: React.FC<{ title: string }> = ({ title }) => {
    const sequenceFrame = useCurrentFrame(); // Relative frame within Sequence
    const { fps } = useVideoConfig();

    // Use sequenceFrame instead of global frame
    // Ensure opacity reaches 0 at the end of sequence (sequenceDuration - 1 is the last frame)
    const titleOpacity = interpolate(
      sequenceFrame,
      [titleFadeOutStart, sequenceDuration - 1],
      [1, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const titleTranslateY = interpolate(
      sequenceFrame,
      [titleFadeOutStart, sequenceDuration - 1],
      [0, -100],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const logoOut = spring({
      fps,
      frame: sequenceFrame,
      config: {
        damping: 200,
      },
      durationInFrames: transitionDuration,
      delay: transitionStart,
    });

    return (
      <>
        <Rings outProgress={logoOut}></Rings>
        <AbsoluteFill className="justify-center items-center" style={{ flexDirection: 'column' }}>
          <Logo outProgress={logoOut}></Logo>
          <div
            style={{
              opacity: sequenceFrame >= titleFadeOutStart ? titleOpacity : 1,
              transform: `translateY(${sequenceFrame >= titleFadeOutStart ? titleTranslateY : 0}px)`,
            }}
          >
            <TextFade>
              <h1
                className="text-[70px] font-bold"
                style={{
                  fontFamily,
                  width: '100%',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  padding: '0 40px',
                  marginTop: '160px',
                }}
              >
                {title}
              </h1>
            </TextFade>
          </div>
        </AbsoluteFill>
      </>
    );
  };

  return (
    <AbsoluteFill className="bg-white">
      <Sequence durationInFrames={sequenceDuration}>
        <TitleSequence title={title} />
      </Sequence>
      <Sequence from={thirdTitleStart} durationInFrames={thirdTitleDuration}>
        <AbsoluteFill className="justify-center items-center">
          {jsonTitle && (
            <TextFade>
              <h1
                className="text-[70px] font-bold"
                style={{
                  fontFamily,
                  width: '100%',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  padding: '0 40px',
                }}
              >
                {jsonTitle}
              </h1>
            </TextFade>
          )}
        </AbsoluteFill>
      </Sequence>
      {/* Watermark sequence */}
      <Sequence from={thirdTitleStart} durationInFrames={thirdTitleDuration}>
        <AbsoluteFill>
          <WatermarkText />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
