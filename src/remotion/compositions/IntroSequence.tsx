import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Logo } from './Logo';
import { Rings } from './Rings';
import { TextFade } from './TextFade';
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";

loadFont("normal", {
	subsets: ["latin"],
	weights: ["400", "700"],
});

interface IntroSequenceProps {
	title: string;
}

export const IntroSequence: React.FC<IntroSequenceProps> = ({ title }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const transitionStart = 1 * fps;
	const transitionDuration = 0.5 * fps;
	const sequenceDuration = 2.5 * fps; // Extended to 2.5 seconds
	const titleFadeOutStart = sequenceDuration - 0.2 * fps;
	const titleFadeOutDuration = 0.2 * fps; // Faster fade out

	const logoOut = spring({
		fps,
		frame,
		config: {
			damping: 200,
		},
		durationInFrames: transitionDuration,
		delay: transitionStart,
	});

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

	// Logo fade out before sequence ends
	const logoFadeOutStart = sequenceDuration - 0.3 * fps; // Start fading 0.3s before sequence ends
	const logoFadeOutDuration = 0.3 * fps;
	const logoOpacity = interpolate(
		frame,
		[logoFadeOutStart, logoFadeOutStart + logoFadeOutDuration],
		[1, 0],
		{
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	return (
		<AbsoluteFill className="bg-white">
			<Rings outProgress={logoOut}></Rings>
			<AbsoluteFill className="justify-center items-center" style={{ flexDirection: 'column', gap: '40px' }}>
				<div style={{ opacity: logoOpacity }}>
					<Logo outProgress={logoOut}></Logo>
				</div>
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
		</AbsoluteFill>
	);
};
