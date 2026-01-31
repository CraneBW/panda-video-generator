import React, { useState, useEffect } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, staticFile, useDelayRender } from 'remotion';
import { Intro } from './Intro';
import { Content } from './Content';

// Parse VTT file to get duration
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

export const Video: React.FC<{
	title?: string;
	audioFile?: string;
	vttFile?: string;
}> = ({
	title = 'Default Title',
	audioFile = 'audio/audio.mp3',
	vttFile = 'audio/audio.vtt',
}) => {
		const { fps } = useVideoConfig();
		const [contentDuration, setContentDuration] = useState<number>(0);
		const [jsonTitle, setJsonTitle] = useState<string | null>(null);
		const [loaded, setLoaded] = useState(false);
		const { delayRender, continueRender } = useDelayRender();
		const [handle] = useState(() => delayRender());

		// Load VTT file to calculate content duration and title.json
		useEffect(() => {
			const loadData = async () => {
				try {
					// Load content duration
					const duration = await getAudioDurationFromVtt(vttFile);
					setContentDuration(duration);

					// Load title from title.json
					try {
						const response = await fetch(staticFile('out/title.json'));
						if (response.ok) {
							const data = await response.json();
							setJsonTitle(data.title || null);
						}
					} catch (e) {
						console.warn('title.json not found, skipping third title');
					}

					setLoaded(true);
				} catch (e) {
					console.error('Failed to load data:', e);
					setLoaded(true);
				}
			};
			loadData();
		}, [vttFile]);

		useEffect(() => {
			if (loaded) {
				continueRender(handle);
			}
		}, [loaded, continueRender, handle]);

		// Intro duration: sequenceDuration (1.5s) + thirdTitleDuration (3s) = 4.5 seconds
		const introDuration = Math.ceil(4.5 * fps);
		// Sequence 3: Content (audio duration)
		const seq3Start = introDuration;
		const contentDurationFrames = Math.ceil(contentDuration * fps);

		if (!loaded || contentDurationFrames === 0) {
			return null;
		}

		return (
			<AbsoluteFill>
				{/* Intro sequence - includes logo, title, third title, and watermark */}
				<Sequence durationInFrames={introDuration}>
					<Intro title={title} />
				</Sequence>

				{/* Sequence 3: Content */}
				<Sequence from={seq3Start} durationInFrames={contentDurationFrames}>
					<Content audioFile={audioFile} vttFile={vttFile} />
				</Sequence>
			</AbsoluteFill>
		);
	};
