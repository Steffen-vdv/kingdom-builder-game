import React from 'react';
import BlockingScreen from '../common/BlockingScreen';

export default function GameSessionLoadingScreen() {
	return (
		<BlockingScreen
			title="Preparing your kingdom..."
			description="Finalizing your opening turn."
		>
			<p className="text-sm text-slate-300 dark:text-slate-200">
				Gathering the latest reports from your advisors...
			</p>
		</BlockingScreen>
	);
}
