import React from 'react';
import { AbsoluteFill, useVideoConfig, useCurrentFrame, spring, staticFile, interpolate } from 'remotion';

interface CoverProps {
	title?: string;
	backgroundColor?: string;
	gradientColors?: string[];
	gradientDirection?: 'horizontal' | 'vertical' | 'diagonal';
}

export const Cover: React.FC<CoverProps> = ({
	title,
	backgroundColor,
	gradientColors,
	gradientDirection = 'diagonal',
}) => {
	const { width, height, fps } = useVideoConfig();
	const frame = useCurrentFrame();

	// Logo zoom animation: from 0 to full screen over 3 seconds
	const TITLE_DELAY_SECONDS = 3;
	const TITLE_DELAY_FRAMES = TITLE_DELAY_SECONDS * fps;

	const logoScale = spring({
		fps,
		frame,
		config: {
			damping: 200,
			mass: 1,
		},
		durationInFrames: TITLE_DELAY_FRAMES,
	});

	// Scale from 0 to full screen (cover entire viewport)
	// Calculate scale factor: 0 to maxDimension/baseLogoSize
	const baseLogoSize = 200;
	const maxDimension = Math.max(width, height);
	const scaleFactor = interpolate(logoScale, [0, 1], [0, maxDimension / baseLogoSize], {
		extrapolateRight: 'clamp',
	});

	// Determine background style - default to bright elegant gradient
	let backgroundStyle: React.CSSProperties = {};

	if (gradientColors && gradientColors.length > 0) {
		// Use gradient
		let gradientString = '';

		if (gradientColors.length === 1) {
			// Single color - use solid color
			backgroundStyle.backgroundColor = gradientColors[0];
		} else {
			// Multiple colors - create gradient
			const colors = gradientColors.join(', ');

			switch (gradientDirection) {
				case 'horizontal':
					gradientString = `linear-gradient(to right, ${colors})`;
					break;
				case 'vertical':
					gradientString = `linear-gradient(to bottom, ${colors})`;
					break;
				case 'diagonal':
				default:
					gradientString = `linear-gradient(135deg, ${colors})`;
					break;
			}

			backgroundStyle.background = gradientString;
		}
	} else if (backgroundColor) {
		// Use provided solid color
		backgroundStyle.backgroundColor = backgroundColor;
	} else {
		// Default elegant bright gradient
		backgroundStyle.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
	}

	return (
		<AbsoluteFill style={backgroundStyle}>
			{/* Logo zoom animation - from center to full screen */}
			<AbsoluteFill
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: 5,
				}}
			>
				{frame < TITLE_DELAY_FRAMES && (
					<img
						src={staticFile('logo/logo.png')}
						alt="Logo"
						style={{
							width: `${baseLogoSize}px`,
							height: `${baseLogoSize}px`,
							objectFit: 'contain',
							transform: `translate(-50%, -50%) scale(${scaleFactor})`,
							position: 'absolute',
							top: '50%',
							left: '50%',
							transformOrigin: 'center center',
						}}
					/>
				)}
			</AbsoluteFill>

			{/* Elegant decorative elements */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 50%)',
					pointerEvents: 'none',
					zIndex: 1,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
					pointerEvents: 'none',
					zIndex: 1,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
					pointerEvents: 'none',
					zIndex: 1,
				}}
			/>

			{/* Title Overlay - only show if title provided */}
			{title && (
				<div
					style={{
						position: 'absolute',
						bottom: '20%',
						left: '50%',
						transform: 'translateX(-50%)',
						color: '#FFFFFF',
						fontSize: Math.min(width / 8, 120),
						fontWeight: 800,
						textAlign: 'center',
						fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
						backgroundColor: 'rgba(255, 255, 255, 0.2)',
						padding: '50px 100px',
						borderRadius: '24px',
						zIndex: 21,
						textShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
						maxWidth: '90%',
						backdropFilter: 'blur(20px) saturate(180%)',
						border: '2px solid rgba(255, 255, 255, 0.4)',
						boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
						letterSpacing: '1px',
						lineHeight: '1.2',
					}}
				>
					{title}
				</div>
			)}
		</AbsoluteFill>
	);
};
