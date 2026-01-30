import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TextFade } from './TextFade';
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";

loadFont("normal", {
	subsets: ["latin"],
	weights: ["400", "700"],
});

interface TitleSequenceProps {
	title: string;
}

export const TitleSequence: React.FC<TitleSequenceProps> = ({ title }) => {
	return (
		<AbsoluteFill className="bg-white justify-center items-center">
			<TextFade>
				<h1
					className="text-[70px] font-bold"
					style={{
						fontFamily,
						width: '100%',
						maxWidth: '100%',
						whiteSpace: 'nowrap',
						textAlign: 'center',
						padding: '0 40px',
					}}
				>
					{title}
				</h1>
			</TextFade>
		</AbsoluteFill>
	);
};
