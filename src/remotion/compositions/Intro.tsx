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
import { REMOTION_PATHS } from "../../../types/paths";
import { Logo } from "./Logo";
import { loadFont as loadInterFont, fontFamily } from "@remotion/google-fonts/Inter";
import { loadFont } from "@remotion/fonts";
import { Rings } from "./Rings";
import { useState, useEffect, useCallback } from "react";

loadInterFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700"],
});

// Load custom font for first title
loadFont({
  family: "dingliesongtypeface",
  url: staticFile("fonts/dingliesongtypeface.ttf"),
}).catch((err) => {
  console.error('Failed to load font:', err);
});

/** GitHub mark only (official path); inherits `color` via currentColor. */
const GitHubMark: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 98 96"
    aria-hidden
    style={{ flexShrink: 0 }}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.225-22.243-5.546-22.243-24.705 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 19.216-11.416 23.443-22.124 24.659 1.735 1.49 3.316 4.391 3.316 8.867 0 6.398-.08 11.546-.08 13.19 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
    />
  </svg>
);

// Watermark: GitHub mark + project name (EN / CN) for on-screen attribution
const WatermarkText: React.FC = () => {
  const color = 'rgba(23, 23, 23, 0.4)';
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '140px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontFamily,
        fontSize: '28px',
        color,
        textAlign: 'left',
        whiteSpace: 'nowrap',
      }}
    >
      <GitHubMark size={32} />
      <span>
        Panda Video Generator
        <span style={{ margin: '0 0.4em', opacity: 0.75 }}>·</span>
        熊猫视频自动化引擎
      </span>
    </div>
  );
};

// TitleSequence component with logo - exported for use at the end of video
export const TitleSequence: React.FC = () => {
  const sequenceFrame = useCurrentFrame(); // Relative frame within Sequence
  const { fps } = useVideoConfig();

  const transitionStart = 1 * fps; // Start transition after 1 second
  const transitionDuration = 0.5 * fps; // Transition duration 0.5 seconds
  const sequenceDuration = 4 * fps; // Total: 4 seconds (extended for longer logo display)

  // Fixed text for h2 between logo
  const fixedTitle = "熊猫智研社";

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
          <h4
            className="text-[70px] font-bold"
            style={{
              fontFamily,
              width: '80%',
              maxWidth: '80%',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              marginTop: '40px',
              color: '#000000',
            }}
          >
            {fixedTitle}
          </h4>
        </div>
      </AbsoluteFill>
      <WatermarkText />
    </div>
  );
};

export const Intro = ({ title }: z.infer<typeof CompositionProps>) => {
  const { fps } = useVideoConfig();
  const [jsonTitle, setJsonTitle] = useState<string | null>(null);
  const [titleLoaded, setTitleLoaded] = useState(false);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender());

  // Always load title from title.json (must be in public/video/title.json)
  // This ensures we always use the latest title from the file system
  const fetchTitleFromJson = useCallback(async () => {
    try {
      // Use staticFile to access files in public directory
      const response = await fetch(staticFile(REMOTION_PATHS.VIDEO_TITLE_JSON));
      if (!response.ok) {
        console.warn(`title.json not found at ${REMOTION_PATHS.VIDEO_TITLE_JSON}, using prop title as fallback`);
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

  const thirdTitleDuration = 3.5 * fps; // First title: 2s typewriter + 1s hold + 0.5s fade = 3.5s total

  // First title component with typewriter effect
  const FirstTitle: React.FC<{ title: string }> = ({ title }) => {
    const sequenceFrame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Typewriter effect: finish within 2 seconds
    const typewriterDuration = 2 * fps; // 2 seconds for typing
    const typewriterSpeed = title.length / 2; // Characters per second (dynamic based on title length)
    const charactersPerFrame = typewriterSpeed / fps;
    const visibleCharacters = Math.min(
      Math.floor(sequenceFrame * charactersPerFrame),
      title.length
    );
    const displayText = title.slice(0, visibleCharacters);
    const isTypingComplete = sequenceFrame >= typewriterDuration;

    // Cursor blink animation (only show while typing, within first 2 seconds)
    const cursorBlinkSpeed = 2; // Blinks per second
    const cursorOpacity = sequenceFrame < typewriterDuration && !isTypingComplete
      ? interpolate(
        sequenceFrame % (fps / cursorBlinkSpeed),
        [0, fps / cursorBlinkSpeed / 2, fps / cursorBlinkSpeed],
        [1, 1, 0],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }
      )
      : 0;

    // Fade out in the last 0.5 seconds (from 3s to 3.5s)
    const fadeOutDuration = 0.5 * fps;
    const fadeOutStart = thirdTitleDuration - fadeOutDuration; // Start fade at 3 seconds

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
            fontFamily: "dingliesongtypeface",
            width: '80%',
            maxWidth: '80%',
            textAlign: 'center',
            padding: '0 40px',
            opacity,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-line',
          }}
        >
          {displayText}
          {!isTypingComplete && (
            <span
              style={{
                opacity: cursorOpacity,
                marginLeft: '4px',
                fontWeight: 'bold',
              }}
            >
              |
            </span>
          )}
        </h1>
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill className="bg-white">
      {/* Third title sequence - now first */}
      {/* Use jsonTitle from file for first title, fallback to prop title */}
      <Sequence durationInFrames={thirdTitleDuration}>
        {/* Typewriter sound effect */}
        <Html5Audio
          src={staticFile(REMOTION_PATHS.AUDIO_INTRO_TYPEWRITER)}
          volume={0.6}
          name="Typewriter Sound"
        />
        {(jsonTitle || title) && <FirstTitle title={jsonTitle || title || ''} />}
      </Sequence>
    </AbsoluteFill>
  );
};
