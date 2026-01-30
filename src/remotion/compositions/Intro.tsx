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

  const logoOut = spring({
    fps,
    frame,
    config: {
      damping: 200,
    },
    durationInFrames: transitionDuration,
    delay: transitionStart,
  });

  // Title fade out and move up animation
  const titleOpacity = interpolate(
    frame,
    [titleFadeOutStart, titleFadeOutStart + titleFadeOutDuration],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const titleTranslateY = interpolate(
    frame,
    [titleFadeOutStart, titleFadeOutStart + titleFadeOutDuration],
    [0, -100],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill className="bg-white">
      <Sequence durationInFrames={sequenceDuration}>
        <Rings outProgress={logoOut}></Rings>
        <AbsoluteFill className="justify-center items-center" style={{ flexDirection: 'column', gap: '40px' }}>
          <Logo outProgress={logoOut}></Logo>
          <div
            style={{
              opacity: frame >= titleFadeOutStart ? titleOpacity : 1,
              transform: `translateY(${frame >= titleFadeOutStart ? titleTranslateY : 0}px)`,
              transition: 'opacity 0.3s, transform 0.3s',
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
                }}
              >
                {title}
              </h1>
            </TextFade>
          </div>
        </AbsoluteFill>
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
    </AbsoluteFill>
  );
};
