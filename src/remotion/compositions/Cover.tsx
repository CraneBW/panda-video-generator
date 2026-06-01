import React, { useState, useEffect, useCallback } from 'react';
import { AbsoluteFill, useVideoConfig, staticFile, useDelayRender } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { REMOTION_PATHS } from '../../../types/paths';

// Load custom font
loadFont({
	family: 'dingliesongtypeface',
	url: staticFile('fonts/dingliesongtypeface.ttf'),
}).catch((err) => {
	console.error('Failed to load font:', err);
});

export interface CoverProps {
	title?: string;
	contentTitle?: string;
}

export const Cover: React.FC<CoverProps> = ({ title: _title, contentTitle }) => {
	const { width, height } = useVideoConfig();
	const [jsonTitle, setJsonTitle] = useState<string | null>(null);
	const [titleLoaded, setTitleLoaded] = useState(false);
	const { delayRender, continueRender } = useDelayRender();
	const [handle] = useState(() => delayRender());

	// Always load title from title.json (must be in public/video/title.json)
	// This ensures we always use the latest title from the file system
	const fetchTitleFromJson = useCallback(async () => {
		try {
			// Use staticFile to access files in public directory
			const response = await fetch(staticFile(REMOTION_PATHS.VIDEO_TITLE_JSON));
			if (!response.ok) {
				console.warn(`title.json not found at ${REMOTION_PATHS.VIDEO_TITLE_JSON}, using prop contentTitle as fallback`);
				setTitleLoaded(true);
				return;
			}
			const data = await response.json();
			if (data.title) {
				setJsonTitle(data.title);
				console.log('Loaded title from title.json:', data.title);
			} else {
				console.warn('title.json exists but has no title field, using prop contentTitle as fallback');
			}
			setTitleLoaded(true);
		} catch (e) {
			console.error('Failed to load title.json:', e);
			setTitleLoaded(true); // Still continue even if failed
		}
	}, []);

	useEffect(() => {
		fetchTitleFromJson();
	}, [fetchTitleFromJson]);

	useEffect(() => {
		if (titleLoaded) {
			continueRender(handle);
		}
	}, [titleLoaded, continueRender, handle]);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: '#FFFFFF',
			}}
		>
			{/* Main content title in center */}
			{(jsonTitle || contentTitle) && (
				<div
					style={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						textAlign: 'center',
						width: '80%',
						maxWidth: '80%',
					}}
				>
					<h1
						style={{
							fontFamily: 'dingliesongtypeface',
							fontSize: 100,
							fontWeight: 'bold',
							margin: 0,
							padding: '0 40px',
							wordWrap: 'break-word',
							overflowWrap: 'break-word',
							whiteSpace: 'pre-line',
							lineHeight: 1.2,
						}}
					>
						{jsonTitle || contentTitle}
					</h1>
				</div>
			)}
		</AbsoluteFill>
	);
};
