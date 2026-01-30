import React, { useState, useEffect } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, staticFile, useDelayRender } from 'remotion';
import { IntroSequence } from './IntroSequence';
import { TitleSequence } from './TitleSequence';
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

		// Sequence 1: Intro with Logo and Company Name (1.5 seconds)
		const seq1Duration = Math.ceil(1.5 * fps);
		// Sequence 2: Third Title from title.json (3 seconds)
		const seq2Duration = Math.ceil(3 * fps);
		const seq2Start = seq1Duration;
		// Sequence 3: Content (audio duration)
		const seq3Start = seq1Duration + seq2Duration;
		const contentDurationFrames = Math.ceil(contentDuration * fps);

		if (!loaded || contentDurationFrames === 0) {
			return null;
		}

		return (
			<AbsoluteFill>
				{/* Sequence 1: Intro with Logo and Company Name */}
				<Sequence durationInFrames={seq1Duration}>
					<IntroSequence title={title} />
				</Sequence>

				{/* Sequence 2: Third Title from title.json */}
				{jsonTitle && (
					<Sequence from={seq2Start} durationInFrames={seq2Duration}>
						<TitleSequence title={jsonTitle} />
					</Sequence>
				)}

				{/* Sequence 3: Content */}
				<Sequence from={seq3Start} durationInFrames={contentDurationFrames}>
					<Content audioFile={audioFile} vttFile={vttFile} />
				</Sequence>
			</AbsoluteFill>
		);
	};
