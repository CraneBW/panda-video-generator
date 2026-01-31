import React, { useMemo } from 'react';
import { staticFile, useVideoConfig, Img } from 'remotion';

export const Logo: React.FC<{
	scale?: number;
	outProgress?: number;
}> = ({ scale, outProgress }) => {
	const { width, height } = useVideoConfig();

	const style: React.CSSProperties = useMemo(() => {
		const baseSize = Math.min(width, height) * 0.3; // 30% of smaller dimension
		// If scale is provided, use it; otherwise use outProgress for backward compatibility
		const finalScale = scale !== undefined ? scale : (outProgress !== undefined ? 1 - outProgress : 1);
		return {
			width: baseSize,
			height: baseSize,
			objectFit: 'contain',
			transform: `scale(${finalScale})`,
			transformOrigin: 'center center',
			willChange: 'transform',
		};
	}, [scale, outProgress, width, height]);

	return (
		<Img
			src={staticFile('logo/logo.png')}
			alt="Logo"
			style={style}
		/>
	);
};
