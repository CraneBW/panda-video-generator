import React, { useState, useEffect, useCallback } from 'react';
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	staticFile,
	useDelayRender,
	Html5Audio,
	interpolate,
	spring,
} from 'remotion';
import { loadFont } from '@remotion/fonts';
import { REMOTION_PATHS } from '../../../types/paths';
import { Watermark } from './Watermark';

// Load custom font for captions
loadFont({
	family: 'dingliesongtypeface',
	url: staticFile('fonts/dingliesongtypeface.ttf'),
}).catch((err) => {
	console.error('Failed to load font:', err);
});

interface Caption {
	text: string;
	startMs: number;
	endMs: number;
}

// Parse VTT file
function parseVtt(vttText: string): Caption[] {
	const lines = vttText.split('\n');
	const captions: Caption[] = [];
	let currentCaption: Partial<Caption> | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// Skip WEBVTT header and STYLE section
		if (line === 'WEBVTT' || line.startsWith('STYLE') || line.startsWith('::cue')) {
			continue;
		}

		// Match timestamp line: 00:00:00.000 --> 00:00:02.000
		const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
		if (timeMatch) {
			const startMs =
				parseInt(timeMatch[1]) * 3600000 +
				parseInt(timeMatch[2]) * 60000 +
				parseInt(timeMatch[3]) * 1000 +
				parseInt(timeMatch[4]);
			const endMs =
				parseInt(timeMatch[5]) * 3600000 +
				parseInt(timeMatch[6]) * 60000 +
				parseInt(timeMatch[7]) * 1000 +
				parseInt(timeMatch[8]);

			currentCaption = { startMs, endMs };
			continue;
		}

		// If there's a current caption object and this line is text
		if (currentCaption && line && !line.includes('-->')) {
			if (currentCaption.text) {
				currentCaption.text += '\n' + line;
			} else {
				currentCaption.text = line;
			}

			// Check if next line is empty or new timestamp, if so save current caption
			const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
			if (!nextLine || nextLine.match(/\d{2}:\d{2}:\d{2}\.\d{3}/)) {
				if (currentCaption.startMs !== undefined && currentCaption.endMs !== undefined && currentCaption.text) {
					captions.push({
						startMs: currentCaption.startMs,
						endMs: currentCaption.endMs,
						text: currentCaption.text,
					});
					currentCaption = null;
				}
			}
		}
	}

	return captions;
}

// THIS IS FALLBACK BGM COUNT FOR VIDEO COMPOSITION
const BGM_COUNT_FALLBACK = 14;

// BGM index from env (0..BGM_COUNT-1), or random when not set. No state - stable per process.
const BGM_INDEX = (() => {
	const fromEnv = process.env.REMOTION_BGM_INDEX;
	if (fromEnv !== undefined && fromEnv !== '') {
		const n = parseInt(fromEnv, 10);
		if (!Number.isNaN(n) && n >= 0 && n < BGM_COUNT_FALLBACK) return n;
	}
	return Math.floor(Math.random() * BGM_COUNT_FALLBACK);
})();

interface ContentProps {
	audioFile?: string;
	vttFile?: string;
}

export const Content: React.FC<ContentProps> = ({
	audioFile = REMOTION_PATHS.TTS_AUDIO,
	vttFile = REMOTION_PATHS.TTS_VTT,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const [captions, setCaptions] = useState<Caption[]>([]);
	const [vttLoaded, setVttLoaded] = useState(false);
	const { delayRender, continueRender, cancelRender } = useDelayRender();
	const [handle] = useState(() => delayRender());

	const fetchAndProcessVtt = useCallback(async () => {
		try {
			// Read VTT file
			const response = await fetch(staticFile(vttFile));
			const vttContent = await response.text();

			// Parse VTT file
			const parsedCaptions = parseVtt(vttContent);

			setCaptions(parsedCaptions);
			setVttLoaded(true);
		} catch (e) {
			console.error('Failed to load VTT file:', e);
			cancelRender(e);
		}
	}, [vttFile, cancelRender]);

	useEffect(() => {
		fetchAndProcessVtt();
	}, [fetchAndProcessVtt]);

	// Continue render after VTT is loaded
	useEffect(() => {
		if (vttLoaded) {
			continueRender(handle);
		}
	}, [vttLoaded, continueRender, handle]);

	// Calculate current time in seconds
	// When used in Sequence, frame starts from 0, which is correct for captions
	const currentTimeMs = (frame / fps) * 1000;

	// Find current caption
	const currentCaption = captions.length > 0 ? captions.find(
		caption => currentTimeMs >= caption.startMs && currentTimeMs < caption.endMs
	) : null;

	// Calculate audio end time (last caption's end time)
	const audioEndMs = captions.length > 0
		? Math.max(...captions.map(c => c.endMs))
		: 0;

	// Calculate BGM fade out volume
	// Fade out starts 2 seconds before audio ends
	const fadeOutDurationMs = 2000; // 2 seconds fade out
	const fadeOutStartMs = audioEndMs - fadeOutDurationMs;
	const bgmBaseVolume = 0.3;

	let bgmVolume = bgmBaseVolume;
	if (audioEndMs > 0 && currentTimeMs >= fadeOutStartMs) {
		// Fade out from bgmBaseVolume to 0 over fadeOutDurationMs
		const fadeOutProgress = (currentTimeMs - fadeOutStartMs) / fadeOutDurationMs;
		bgmVolume = interpolate(
			fadeOutProgress,
			[0, 1],
			[bgmBaseVolume, 0],
			{
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
			}
		);
	}

	// Calculate caption font size based on text length
	const calculateCaptionFontSize = (text: string): number => {
		// Count characters (excluding spaces and newlines for calculation)
		const charCount = text.replace(/\s/g, '').length;

		// If more than 50 characters, use smaller font size
		if (charCount > 50) {
			return 52;
		}

		return 80;
	};

	// Dancing lines animation - slow, smooth movement
	// const lineSpeed = 0.05; // Very slow movement speed
	// const lineOffset1 = frame * lineSpeed;
	// const lineOffset2 = frame * lineSpeed * 0.7; // Different speed for variety
	// const lineOffset3 = frame * lineSpeed * 1.3;

	// Wave amplitude and frequency for dancing effect
	// const waveAmplitude = 50; // Increased amplitude for better visibility
	// const waveFrequency = 0.015; // Slightly lower frequency for smoother waves

	// Generate dancing line paths using SVG
	// const generateWavePath = (offset: number, amplitude: number, frequency: number, yPosition: number) => {
	// 	const points: string[] = [];
	// 	const width = 1920; // Video width
	// 	const steps = 100;

	// 	for (let i = 0; i <= steps; i++) {
	// 		const x = (i / steps) * width;
	// 		const y = yPosition + Math.sin((x * frequency) + offset) * amplitude;
	// 		points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
	// 	}

	// 	return points.join(' ');
	// };

	// Calculate animation for current caption (gather effect)
	let scale = 1;
	let opacity = 1;
	let translateX = 0;
	let letterSpacing = 0;

	if (currentCaption) {
		const captionStartMs = currentCaption.startMs;
		const captionDurationMs = currentCaption.endMs - captionStartMs;
		const animationDurationMs = Math.min(500, captionDurationMs * 0.3); // Animation takes 500ms or 30% of caption duration
		const timeSinceStart = currentTimeMs - captionStartMs;

		if (timeSinceStart >= 0 && timeSinceStart < animationDurationMs) {
			// Calculate relative frame for this caption's animation
			const relativeFrame = Math.floor((timeSinceStart / 1000) * fps);
			const animationDurationFrames = Math.ceil((animationDurationMs / 1000) * fps);

			// Spring animation for smooth gather effect
			const springProgress = spring({
				fps,
				frame: relativeFrame,
				config: {
					damping: 200,
				},
				durationInFrames: animationDurationFrames,
			});

			// Scale: start from 1.2, end at 1.0 (zoom in effect)
			// Keep container width fixed, only scale visually
			scale = interpolate(springProgress, [0, 1], [1.2, 1], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
			});

			// Opacity: start from 0, end at 1
			opacity = interpolate(springProgress, [0, 1], [0, 1], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
			});

			// Horizontal gather: start from spread out, end at center
			// Create a gather effect where text comes from both sides to center
			translateX = interpolate(springProgress, [0, 1], [100, 0], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
			});

			// Letter spacing: start from spread out, end at normal (gather effect)
			letterSpacing = interpolate(springProgress, [0, 1], [8, 0], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
			});
		}
	}

	return (
		<AbsoluteFill style={{ backgroundColor: 'transparent' }}>
			{/* Audio track */}
			<Html5Audio
				src={staticFile(audioFile)}
				volume={1}
				name="TTS Audio"
			/>

			{/* Background music - loops throughout content with fade out at audio end */}
			<Html5Audio
				src={staticFile(`bgm/${BGM_INDEX}.mp3`)}
				volume={bgmVolume}
				loop
				name="Background Music"
			/>

			{/* Dancing lines - slow animated background decoration */}
			{/* <svg
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				pointerEvents: 'none',
				zIndex: 1,
			}}
		> */}
			{/* Top dancing line */}
			{/* <path
				d={generateWavePath(lineOffset1, waveAmplitude, waveFrequency, 200)}
				stroke="rgba(0, 0, 0, 0.05)"
				strokeWidth="5"
				fill="none"
				strokeLinecap="round"
			/> */}
			{/* Middle dancing line */}
			{/* <path
				d={generateWavePath(lineOffset2, waveAmplitude * 0.8, waveFrequency * 1.2, 540)}
				stroke="rgba(0, 0, 0, 0.05)"
				strokeWidth="4.5"
				fill="none"
				strokeLinecap="round"
			/> */}
			{/* Bottom dancing line */}
			{/* <path
				d={generateWavePath(lineOffset3, waveAmplitude * 1.2, waveFrequency * 0.8, 880)}
				stroke="rgba(0, 0, 0, 0.05)"
				strokeWidth="4"
				fill="none"
				strokeLinecap="round"
			/> */}
			{/* Additional subtle lines */}
			{/* <path
				d={generateWavePath(lineOffset1 * 0.5, waveAmplitude * 0.6, waveFrequency * 1.5, 350)}
				stroke="rgba(0, 0, 0, 0.05)"
				strokeWidth="3.5"
				fill="none"
				strokeLinecap="round"
			/> */}
			{/* <path
				d={generateWavePath(lineOffset2 * 1.5, waveAmplitude * 0.7, waveFrequency * 0.9, 730)}
				stroke="rgba(0, 0, 0, 0.05)"
				strokeWidth="3.5"
				fill="none"
				strokeLinecap="round"
			/> */}
			{/* </svg> */}

			{/* Current caption display */}
			{currentCaption && (
				<div
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: `translate(calc(-50% + ${translateX}px), -50%) scale(${scale})`,
						transformOrigin: 'center center',
						fontSize: calculateCaptionFontSize(currentCaption.text),
						fontWeight: 'bold',
						textAlign: 'center',
						fontFamily: 'dingliesongtypeface',
						padding: '20px 40px',
						whiteSpace: 'pre-line',
						width: '80%',
						maxWidth: '80vw',
						zIndex: 10,
						opacity
					}}
				>
					{/* Caption text with letter spacing animation for gather effect */}
					<div
						style={{
							position: 'relative',
							letterSpacing: `${letterSpacing}px`,
						}}
					>
						{/* Background layer - black stroke for border */}
						<div
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								color: 'transparent',
								WebkitTextStroke: '6px #000000',
								paintOrder: 'stroke fill',
							}}
						>
							{currentCaption.text}
						</div>
						{/* Foreground layer - white text */}
						<div
							style={{
								position: 'relative',
								color: '#FFFFFF',
							}}
						>
							{currentCaption.text}
						</div>
					</div>
				</div>
			)}

			{/* Watermark - randomly displayed */}
			<Watermark />
		</AbsoluteFill>
	);
};
