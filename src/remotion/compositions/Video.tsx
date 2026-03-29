import React, { useState, useEffect } from 'react';
import { AbsoluteFill, Sequence, useVideoConfig, staticFile, useDelayRender, Html5Audio } from 'remotion';
import { Video as RemotionVideo } from '@remotion/media';
import { REMOTION_PATHS } from '../../../types/paths';
import { Intro, TitleSequence } from './Intro';
import { Content } from './Content';
import { Watermark } from './Watermark';
import { Cover } from './Cover';

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

const BG_VIDEO_RELATIVE = 'video/0.mp4';

// Background clip is versioned at public/video/0.mp4. Optional: shuffle-bg-videos.sh to re-index before render.

export const Video: React.FC<{
	title?: string;
	audioFile?: string;
	/** Timeline for content Sequence length (TTS-aligned). */
	vttFile?: string;
	captionVttFile?: string;
}> = ({
	title = 'Default Title',
	audioFile = REMOTION_PATHS.TTS_AUDIO,
	vttFile = REMOTION_PATHS.TTS_VTT,
	captionVttFile = REMOTION_PATHS.TTS_VTT,
}) => {
		const { fps } = useVideoConfig();
		const [contentDuration, setContentDuration] = useState<number>(0);
		const [loaded, setLoaded] = useState(false);
		const { delayRender, continueRender } = useDelayRender();
		const [handle] = useState(() => delayRender());

		// Load VTT for timeline duration.
		useEffect(() => {
			const loadData = async () => {
				try {
					const duration = await getAudioDurationFromVtt(vttFile);
					setContentDuration(duration);
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

		// Cover duration: 0.5 seconds
		const coverDuration = Math.ceil(0.5 * fps);
		// Intro duration: only thirdTitleDuration (3.5s) - logo sequence moved to end
		const introDuration = Math.ceil(3.5 * fps);
		// Cover starts at the beginning
		const coverStart = 0;
		// Intro starts after cover
		const introStart = coverDuration;
		// Sequence 3: Content (audio duration + 2 seconds tail extension) starts after cover + intro
		const seq3Start = coverDuration + introDuration;
		const contentTailExtension = 2; // 2 seconds extension at the tail
		const contentDurationFrames = Math.ceil((contentDuration + contentTailExtension) * fps);
		// Logo sequence duration: 4 seconds
		const logoSequenceDuration = Math.ceil(4 * fps);
		const logoSequenceStart = seq3Start + contentDurationFrames;

		if (!loaded || contentDuration === 0) {
			return null;
		}

		return (
			<AbsoluteFill
			// style={{
			// 	filter: 'invert(1)',
			// }}
			>
				{/* Background video */}
				<RemotionVideo
					src={staticFile(BG_VIDEO_RELATIVE)}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
						objectFit: 'cover',
						filter: 'brightness(0.8)',
					}}
					muted
					loop
				/>

				{/* Cover sequence - displayed first */}
				<Sequence from={coverStart} durationInFrames={coverDuration}>
					<Cover title={title} />
				</Sequence>

				{/* Intro sequence - only includes first title (logo moved to end) */}
				<Sequence from={introStart} durationInFrames={introDuration}>
					<Intro title={title} />
				</Sequence>

				{/* Sequence 3: Content */}
				<Sequence from={seq3Start} durationInFrames={contentDurationFrames}>
					<Content audioFile={audioFile} captionVttFile={captionVttFile} />
				</Sequence>

				{/* Watermark sequence - starts from content sequence, overlays content only */}
				<Sequence from={seq3Start} durationInFrames={contentDurationFrames}>
					<Watermark />
				</Sequence>

				{/* Logo sequence - moved to the end */}
				<Sequence from={logoSequenceStart} durationInFrames={logoSequenceDuration}>
					<AbsoluteFill className="bg-white">
						{/* Logo sound effect */}
						<Html5Audio
							src={staticFile(REMOTION_PATHS.AUDIO_INTRO)}
							volume={0.6}
							name="Logo Sound"
						/>
						<TitleSequence />
					</AbsoluteFill>
				</Sequence>
			</AbsoluteFill>
		);
	};
