import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

const TERMINAL_BG = '#1e1e1e';
const TERMINAL_TEXT = '#00ff00'; // 绿色终端文字
const CODE_KEYWORD = '#569cd6'; // 蓝色关键字
const CODE_STRING = '#ce9178'; // 橙色字符串
const WINDOW_BG = '#2d2d2d';
const WINDOW_BORDER = '#404040';

// JavaScript Hello World 代码
const CODE_LINES = [
	'function sayHello() {',
	'  console.log("Hello, World!");',
	'  return "Hello, World!";',
	'}',
	'',
	'sayHello();',
];

const CHAR_FRAMES = 2; // 每个字符显示的帧数
const LINE_BREAK_FRAMES = 10; // 每行之间的延迟帧数
const CURSOR_BLINK_FRAMES = 20; // 光标闪烁周期
const START_DELAY = 30; // 开始输入前的延迟帧数
const END_PAUSE_SECONDS = 3; // 最后一行完成后的停顿秒数

// 计算每行的起始帧
const getLineStartFrame = (lineIndex: number, charFrames: number, lineBreakFrames: number, startDelay: number): number => {
	let totalChars = 0;
	for (let i = 0; i < lineIndex; i++) {
		totalChars += CODE_LINES[i].length;
	}
	return startDelay + totalChars * charFrames + lineIndex * lineBreakFrames;
};

// 计算所有代码输入完成的总帧数
const getTotalTypingFrames = (
	lines: string[],
	charFrames: number,
	lineBreakFrames: number,
	startDelay: number,
): number => {
	if (lines.length === 0) return startDelay;
	const lastLineIndex = lines.length - 1;
	const lastLineStartFrame = getLineStartFrame(lastLineIndex, charFrames, lineBreakFrames, startDelay);
	return lastLineStartFrame + lines[lastLineIndex].length * charFrames;
};

// 获取当前帧应该显示的行和字符
const getTypedLines = ({
	frame,
	lines,
	charFrames,
	lineBreakFrames,
	startDelay,
	endPauseFrames,
}: {
	frame: number;
	lines: string[];
	charFrames: number;
	lineBreakFrames: number;
	startDelay: number;
	endPauseFrames: number;
}): Array<{ line: string; isComplete: boolean }> => {
	const result: Array<{ line: string; isComplete: boolean }> = [];

	// 计算所有代码输入完成的帧数
	const typingEndFrame = getTotalTypingFrames(lines, charFrames, lineBreakFrames, startDelay);

	// 如果还在停顿期间，显示所有完成的代码
	const isInPause = frame >= typingEndFrame && frame < typingEndFrame + endPauseFrames;

	for (let i = 0; i < lines.length; i++) {
		const lineStartFrame = getLineStartFrame(i, charFrames, lineBreakFrames, startDelay);
		const lineEndFrame = lineStartFrame + lines[i].length * charFrames;

		if (frame < lineStartFrame) {
			// 这一行还没开始
			result.push({ line: '', isComplete: false });
		} else if (frame >= lineEndFrame || isInPause) {
			// 这一行已经完成（包括停顿期间）
			result.push({ line: lines[i], isComplete: true });
		} else {
			// 这一行正在输入中
			const charsTyped = Math.floor((frame - lineStartFrame) / charFrames);
			result.push({
				line: lines[i].slice(0, charsTyped),
				isComplete: false
			});
		}
	}

	return result;
};

// 语法高亮：简单的关键字和字符串识别
const highlightCode = (line: string): React.ReactNode => {
	const parts: Array<{ text: string; color: string }> = [];
	let currentPart = '';
	let inString = false;
	let stringChar = '';

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (!inString && (char === '"' || char === "'")) {
			if (currentPart) {
				parts.push({ text: currentPart, color: TERMINAL_TEXT });
				currentPart = '';
			}
			inString = true;
			stringChar = char;
			currentPart = char;
		} else if (inString && char === stringChar && line[i - 1] !== '\\') {
			currentPart += char;
			parts.push({ text: currentPart, color: CODE_STRING });
			currentPart = '';
			inString = false;
		} else {
			currentPart += char;
		}
	}

	if (currentPart) {
		parts.push({
			text: currentPart,
			color: inString ? CODE_STRING : TERMINAL_TEXT
		});
	}

	// 简单的关键字高亮
	const keywords = ['function', 'return', 'console', 'log'];
	const finalParts: Array<{ text: string; color: string }> = [];

	for (const part of parts) {
		if (part.color === CODE_STRING) {
			finalParts.push(part);
			continue;
		}

		let remaining = part.text;
		while (remaining.length > 0) {
			let found = false;
			for (const keyword of keywords) {
				const regex = new RegExp(`^\\b${keyword}\\b`);
				if (regex.test(remaining)) {
					const before = remaining.substring(0, remaining.indexOf(keyword));
					if (before) {
						finalParts.push({ text: before, color: TERMINAL_TEXT });
					}
					finalParts.push({ text: keyword, color: CODE_KEYWORD });
					remaining = remaining.substring(remaining.indexOf(keyword) + keyword.length);
					found = true;
					break;
				}
			}
			if (!found) {
				finalParts.push({ text: remaining, color: TERMINAL_TEXT });
				break;
			}
		}
	}

	return (
		<>
			{finalParts.map((part, idx) => (
				<span key={idx} style={{ color: part.color }}>
					{part.text}
				</span>
			))}
		</>
	);
};

// 闪烁光标组件
const Cursor: React.FC<{
	frame: number;
	blinkFrames: number;
}> = ({ frame, blinkFrames }) => {
	const opacity = interpolate(
		frame % blinkFrames,
		[0, blinkFrames / 2, blinkFrames],
		[1, 0, 1],
		{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
	);

	return (
		<span
			style={{
				opacity,
				backgroundColor: TERMINAL_TEXT,
				width: '8px',
				height: '20px',
				display: 'inline-block',
				marginLeft: '2px',
				verticalAlign: 'middle',
			}}
		/>
	);
};

export const TerminalWindow: React.FC = () => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();

	// 计算停顿的帧数
	const endPauseFrames = Math.round(fps * END_PAUSE_SECONDS);

	// 计算所有代码输入完成的帧数
	const typingEndFrame = getTotalTypingFrames(CODE_LINES, CHAR_FRAMES, LINE_BREAK_FRAMES, START_DELAY);
	const isInPause = frame >= typingEndFrame && frame < typingEndFrame + endPauseFrames;

	const typedLines = getTypedLines({
		frame,
		lines: CODE_LINES,
		charFrames: CHAR_FRAMES,
		lineBreakFrames: LINE_BREAK_FRAMES,
		startDelay: START_DELAY,
		endPauseFrames,
	});

	// 计算当前正在输入的行索引
	const getCurrentTypingLineIndex = (): number => {
		for (let i = 0; i < typedLines.length; i++) {
			if (!typedLines[i].isComplete && typedLines[i].line.length > 0) {
				return i;
			}
		}
		// 如果所有行都完成了（包括停顿期间），返回最后一行
		return typedLines.length - 1;
	};

	const currentTypingLineIndex = getCurrentTypingLineIndex();
	// 在输入中或在停顿期间都显示光标
	const shouldShowCursor = (typedLines.some(line => !line.isComplete && line.line.length > 0)) || isInPause;

	const windowWidth = Math.min(width * 0.85, 1000);
	const windowHeight = Math.min(height * 0.7, 500);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: TERMINAL_BG,
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				fontFamily: 'monospace',
			}}
		>
			{/* 终端窗口 */}
			<div
				style={{
					width: windowWidth,
					height: windowHeight,
					backgroundColor: WINDOW_BG,
					borderRadius: '8px',
					border: `1px solid ${WINDOW_BORDER}`,
					boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
					display: 'flex',
					flexDirection: 'column',
					overflow: 'hidden',
				}}
			>
				{/* 窗口标题栏 */}
				<div
					style={{
						height: '32px',
						backgroundColor: '#1a1a1a',
						borderBottom: `1px solid ${WINDOW_BORDER}`,
						display: 'flex',
						alignItems: 'center',
						paddingLeft: '12px',
						gap: '8px',
					}}
				>
					{/* 窗口控制按钮 */}
					<div
						style={{
							width: '12px',
							height: '12px',
							borderRadius: '50%',
							backgroundColor: '#ff5f57',
						}}
					/>
					<div
						style={{
							width: '12px',
							height: '12px',
							borderRadius: '50%',
							backgroundColor: '#ffbd2e',
						}}
					/>
					<div
						style={{
							width: '12px',
							height: '12px',
							borderRadius: '50%',
							backgroundColor: '#28ca42',
						}}
					/>
					{/* 窗口标题 */}
					<div
						style={{
							marginLeft: '12px',
							color: '#888',
							fontSize: '12px',
							fontFamily: 'system-ui, sans-serif',
						}}
					>
						Terminal
					</div>
				</div>

				{/* 终端内容区域 */}
				<div
					style={{
						flex: 1,
						padding: '20px',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-start',
						overflow: 'auto',
					}}
				>
					{/* 代码行 */}
					{typedLines.map((typedLine, index) => (
						<div
							key={index}
							style={{
								fontSize: '18px',
								fontFamily: 'monospace',
								lineHeight: '1.8',
								display: 'flex',
								alignItems: 'center',
								minHeight: '32px',
							}}
						>
							{/* 行号（可选） */}
							<span
								style={{
									color: '#666',
									marginRight: '12px',
									width: '30px',
									textAlign: 'right',
									fontSize: '14px',
								}}
							>
								{index + 1}
							</span>
							{/* 代码内容 */}
							<div style={{ flex: 1, whiteSpace: 'pre' }}>
								{typedLine.line ? highlightCode(typedLine.line) : null}
								{/* 在当前正在输入的行显示光标，或在停顿期间在最后一行显示光标 */}
								{index === currentTypingLineIndex && shouldShowCursor && (
									<Cursor frame={frame} blinkFrames={CURSOR_BLINK_FRAMES} />
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};
