import React, { useMemo } from 'react';
import { staticFile, useVideoConfig } from 'remotion';

export const Logo: React.FC<{
	outProgress: number;
}> = ({ outProgress }) => {
	const { width, height } = useVideoConfig();

	const style: React.CSSProperties = useMemo(() => {
		const baseSize = Math.min(width, height) * 0.3; // 30% of smaller dimension
		return {
			width: baseSize,
			height: baseSize,
			objectFit: 'contain',
			transform: `scale(${1 - outProgress})`,
			transformOrigin: 'center center',
		};
	}, [outProgress, width, height]);

	return (
		<img
			src={staticFile('logo/logo.png')}
			alt="Logo"
			style={style}
		/>
	);
};
