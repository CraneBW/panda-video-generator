import React, { useState, useEffect, useCallback } from 'react';
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	staticFile,
	useDelayRender,
	Html5Audio,
	interpolate,
	Easing,
} from 'remotion';

interface Caption {
	text: string;
	startMs: number;
	endMs: number;
}

// 解析 VTT 文件
function parseVtt(vttText: string): Caption[] {
	const lines = vttText.split('\n');
	const captions: Caption[] = [];
	let currentCaption: Partial<Caption> | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		// 跳过WEBVTT头部和STYLE部分
		if (line === 'WEBVTT' || line.startsWith('STYLE') || line.startsWith('::cue')) {
			continue;
		}

		// 匹配时间码行: 00:00:00.000 --> 00:00:02.000
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

		// 如果当前有字幕对象且这一行是文本
		if (currentCaption && line && !line.includes('-->')) {
			if (currentCaption.text) {
				currentCaption.text += '\n' + line;
			} else {
				currentCaption.text = line;
			}

			// 检查下一行是否为空或新时间码，如果是则保存当前字幕
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

// 格式化时间显示（毫秒转 MM:SS）
function formatTime(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface TextToSpeechDisplayProps {
	audioFile?: string;
	vttFile?: string;
	imageInterval?: number; // Time interval for image switching in seconds
	imageListFile?: string; // Path to JSON file containing list of images
}

export const TextToSpeechDisplay: React.FC<TextToSpeechDisplayProps> = ({
	audioFile = 'audio/audio.mp3',
	vttFile = 'audio/audio.vtt',
	imageInterval = 15, // Default 15 seconds per image
	imageListFile = 'image/image-list.json', // Default image list file
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const [captions, setCaptions] = useState<Caption[]>([]);
	const [imageList, setImageList] = useState<string[]>([]);
	const [vttLoaded, setVttLoaded] = useState(false);
	const [imageListLoaded, setImageListLoaded] = useState(false);
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

	const fetchImageList = useCallback(async () => {
		try {
			// Read image list JSON file
			const response = await fetch(staticFile(imageListFile));
			const imageListData = await response.json();

			// Ensure it's an array and sort by filename
			const sortedImages = Array.isArray(imageListData)
				? [...imageListData].sort()
				: [];

			setImageList(sortedImages);
			setImageListLoaded(true);
		} catch (e) {
			console.error('Failed to load image list file:', e);
			// Fallback to empty array if file doesn't exist
			setImageList([]);
			setImageListLoaded(true);
		}
	}, [imageListFile]);

	useEffect(() => {
		fetchAndProcessVtt();
		fetchImageList();
	}, [fetchAndProcessVtt, fetchImageList]);

	// Continue render after both VTT and image list are loaded
	useEffect(() => {
		if (vttLoaded && imageListLoaded) {
			continueRender(handle);
		}
	}, [vttLoaded, imageListLoaded, continueRender, handle]);

	if (captions.length === 0 || imageList.length === 0) {
		return null;
	}

	// Calculate current time in seconds
	const currentTimeMs = (frame / fps) * 1000;
	const currentTimeSeconds = currentTimeMs / 1000;

	// Calculate which image to display based on time interval
	// Each image is shown for imageInterval seconds, then loops through all images
	const imageIndex = Math.floor(currentTimeSeconds / imageInterval) % imageList.length;
	const imagePath = imageList[imageIndex];

	// Calculate progress within current image interval (0 to 1)
	const timeInCurrentInterval = currentTimeSeconds % imageInterval;
	const progress = timeInCurrentInterval / imageInterval;

	// Create a slow zoom animation from 120% to 125%
	// Use easing for smooth animation
	const scale = interpolate(
		progress,
		[0, 1],
		[1.2, 1.25], // Start at 120%, end at 125%
		{
			easing: Easing.bezier(0.4, 0, 0.2, 1), // Smooth easing function
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		}
	);

	// Find current caption
	const currentCaption = captions.find(
		caption => currentTimeMs >= caption.startMs && currentTimeMs < caption.endMs
	);

	return (
		<AbsoluteFill>
			{/* Audio track */}
			<Html5Audio
				src={staticFile(audioFile)}
				volume={1}
				name="TTS Audio"
			/>

			{/* Background image - loops every imageInterval seconds with slow zoom animation */}
			<div
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%',
					backgroundImage: `url(${staticFile(imagePath)})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
					backgroundRepeat: 'no-repeat',
					transform: `scale(${scale})`,
					transition: 'transform 0.1s ease-out', // Smooth transition between frames
				}}
			/>

			{/* Overlay gradient for better text readability */}
			<div
				style={{
					position: 'absolute',
					width: '100%',
					height: '100%',
					background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)',
				}}
			/>

			{/* Current caption display */}
			{currentCaption && (
				<div
					style={{
						position: 'absolute',
						bottom: '80px',
						left: '50%',
						transform: 'translateX(-50%)',
						color: '#FFFFFF',
						fontSize: 24,
						fontWeight: 'bold',
						textAlign: 'center',
						fontFamily: 'Arial, sans-serif',
						backgroundColor: 'rgba(0, 0, 0, 0.7)',
						padding: '20px 40px',
						borderRadius: '8px',
						whiteSpace: 'pre-line',
						maxWidth: '90%',
						width: 'auto',
						zIndex: 10,
					}}
				>
					{/* Caption text */}
					<div>{currentCaption.text}</div>
				</div>
			)}
		</AbsoluteFill>
	);
};
