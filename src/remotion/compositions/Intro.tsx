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
  Html5Audio,
} from "remotion";
import { CompositionProps } from "../../../types/constants";
import { Logo } from "./Logo";
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";
import { Rings } from "./Rings";
import { useState, useEffect, useCallback } from "react";

loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700"],
});
export const Intro = ({ title }: z.infer<typeof CompositionProps>) => {
  const { fps } = useVideoConfig();
  const [jsonTitle, setJsonTitle] = useState<string | null>(null);
  const [titleLoaded, setTitleLoaded] = useState(false);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  // Always load title from title.json (must be in public/out/title.json)
  // This ensures we always use the latest title from the file system
  const fetchTitleFromJson = useCallback(async () => {
    try {
      // Use staticFile to access files in public directory
      const response = await fetch(staticFile('out/title.json'));
      if (!response.ok) {
        console.warn('title.json not found in public/out/, using prop title as fallback');
        setTitleLoaded(true);
        return;
      }
      const data = await response.json();
      if (data.title) {
        setJsonTitle(data.title);
        console.log('Loaded title from title.json:', data.title);
      } else {
        console.warn('title.json exists but has no title field, using prop title as fallback');
      }
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
  const sequenceDuration = 2.5 * fps; // Total: 2.5 seconds (extended from 1.5s)
  const thirdTitleDuration = 2 * fps; // First title displays for 2 seconds (reduced from 3s)

  // Watermark component
  const WatermarkText: React.FC = () => {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily,
          fontSize: '30px',
          color: 'rgba(23, 23, 23, 0.4)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
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

    // Logo scale animation: from small (0.2) to normal size (1.0)
    // Animation duration: first 0.8 seconds, then stay at normal size
    const logoScaleDuration = 0.8 * fps;
    const logoScale = interpolate(
      sequenceFrame,
      [0, logoScaleDuration],
      [0.2, 1.0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    // Title animation: fade in and move from top to bottom
    const titleFadeInDuration = 0.5 * fps;
    const titleStartDelay = logoScaleDuration; // Start after logo finishes scaling
    const titleFadeInStart = titleStartDelay;
    const titleFadeInEnd = titleStartDelay + titleFadeInDuration;

    const titleFadeInOpacity = interpolate(
      sequenceFrame,
      [titleFadeInStart, titleFadeInEnd],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    const titleMoveY = interpolate(
      sequenceFrame,
      [titleFadeInStart, titleFadeInEnd],
      [-50, 0], // Move from -50px (above) to 0 (final position)
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    // Fade out all content at the end
    const fadeOutDuration = 0.5 * fps;
    const fadeOutStart = sequenceDuration - fadeOutDuration;
    const overallOpacity = interpolate(
      sequenceFrame,
      [fadeOutStart, sequenceDuration - 1],
      [1, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    // Rings animation (keep the original outProgress for rings)
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
      <div style={{ opacity: overallOpacity }}>
        <Rings outProgress={logoOut}></Rings>
        <AbsoluteFill className="justify-center items-center" style={{ flexDirection: 'column' }}>
          <Logo scale={logoScale}></Logo>
          <div
            style={{
              opacity: titleFadeInOpacity,
              transform: `translateY(${titleMoveY}px)`,
            }}
          >
            <h1
              className="text-[70px] font-bold"
              style={{
                fontFamily,
                width: '80%',
                maxWidth: '80%',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                padding: '0 40px',
                marginTop: '120px',
                color: '#000000',
              }}
            >
              {title}
            </h1>
          </div>
        </AbsoluteFill>
        <WatermarkText />
      </div>
    );
  };

  // First title component with fade out only
  const FirstTitle: React.FC<{ title: string }> = ({ title }) => {
    const sequenceFrame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Fade out in the last 0.5 seconds
    const fadeOutDuration = 0.5 * fps;
    const fadeOutStart = thirdTitleDuration - fadeOutDuration;

    const opacity = interpolate(
      sequenceFrame,
      [fadeOutStart, thirdTitleDuration - 1],
      [1, 0],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );

    return (
      <AbsoluteFill className="justify-center items-center">
        <h1
          className="text-[70px] font-bold"
          style={{
            fontFamily,
            width: '80%',
            maxWidth: '80%',
            textAlign: 'center',
            padding: '0 40px',
            opacity,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {title}
        </h1>
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill className="bg-white">
      {/* Logo sound effect - plays when logo sequence starts (at thirdTitleDuration) */}
      <Sequence from={thirdTitleDuration} durationInFrames={sequenceDuration}>
        <Html5Audio
          src={staticFile('audio/intro.mp3')}
          volume={0.6}
          name="Logo Sound"
        />
      </Sequence>
      {/* Third title sequence - now first */}
      {/* Use jsonTitle from file for first title, fallback to prop title */}
      <Sequence durationInFrames={thirdTitleDuration}>
        {(jsonTitle || title) && <FirstTitle title={jsonTitle || title || ''} />}
      </Sequence>
      {/* Title sequence with logo - now third */}
      {/* Always use prop title for second title (do not change) */}
      <Sequence from={thirdTitleDuration} durationInFrames={sequenceDuration}>
        <TitleSequence title={title} />
      </Sequence>
    </AbsoluteFill>
  );
};
