import React, { useState, useEffect, useCallback } from 'react';
import {
	AbsoluteFill,
	useCurrentFrame,
	useVideoConfig,
	staticFile,
	useDelayRender,
	Html5Audio,
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
}

export const TextToSpeechDisplay: React.FC<TextToSpeechDisplayProps> = ({
	audioFile = 'audio/audio.mp3',
	vttFile = 'audio/audio.vtt'
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();
	const [captions, setCaptions] = useState<Caption[]>([]);
	const { delayRender, continueRender, cancelRender } = useDelayRender();
	const [handle] = useState(() => delayRender());

	const fetchAndProcessVtt = useCallback(async () => {
		try {
			// 读取 VTT 文件
			const response = await fetch(staticFile(vttFile));
			const vttContent = await response.text();

			// 解析 VTT 文件
			const parsedCaptions = parseVtt(vttContent);

			setCaptions(parsedCaptions);
			continueRender(handle);
		} catch (e) {
			console.error('Failed to load VTT file:', e);
			cancelRender(e);
		}
	}, [vttFile, continueRender, cancelRender, handle]);

	useEffect(() => {
		fetchAndProcessVtt();
	}, [fetchAndProcessVtt]);

	if (captions.length === 0) {
		return null;
	}

	// 根据当前帧计算应该显示哪个字幕
	const currentTimeMs = (frame / fps) * 1000;
	const currentCaption = captions.find(
		caption => currentTimeMs >= caption.startMs && currentTimeMs < caption.endMs
	);

	return (
		<AbsoluteFill>
			{/* 添加音频轨道 */}
			<Html5Audio
				src={staticFile(audioFile)}
				volume={1}
				name="TTS Audio"
			/>

			{/* 只显示当前时间段的字幕 */}
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
					}}
				>
					{/* 显示时间戳 */}
					<div
						style={{
							fontSize: 14,
							fontWeight: 'normal',
							color: '#CCCCCC',
							marginBottom: '8px',
							opacity: 0.8,
						}}
					>
						{formatTime(currentCaption.startMs)} - {formatTime(currentCaption.endMs)}
					</div>
					{/* 显示字幕文本 */}
					<div>{currentCaption.text}</div>
				</div>
			)}
		</AbsoluteFill>
	);
};
