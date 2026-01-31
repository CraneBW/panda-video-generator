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

interface ContentProps {
	audioFile?: string;
	vttFile?: string;
}

export const Content: React.FC<ContentProps> = ({
	audioFile = 'audio/audio.mp3',
	vttFile = 'audio/audio.vtt',
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
		<AbsoluteFill style={{ backgroundColor: '#FFFFFF' }}>
			{/* Audio track */}
			<Html5Audio
				src={staticFile(audioFile)}
				volume={1}
				name="TTS Audio"
			/>

			{/* Current caption display */}
			{currentCaption && (
				<div
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: `translate(calc(-50% + ${translateX}px), -50%) scale(${scale})`,
						transformOrigin: 'center center',
						color: '#000000',
						fontSize: 48,
						fontWeight: 'bold',
						textAlign: 'center',
						fontFamily: 'Arial, sans-serif',
						backgroundColor: 'rgba(255, 255, 255, 0.9)',
						padding: '20px 40px',
						borderRadius: '8px',
						whiteSpace: 'pre-line',
						width: '80%',
						maxWidth: '80vw',
						zIndex: 10,
						opacity,
					}}
				>
					{/* Caption text with letter spacing animation for gather effect */}
					<div
						style={{
							letterSpacing: `${letterSpacing}px`,
						}}
					>
						{currentCaption.text}
					</div>
				</div>
			)}
		</AbsoluteFill>
	);
};
