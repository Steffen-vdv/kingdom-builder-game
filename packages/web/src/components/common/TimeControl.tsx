import React from 'react';
import { useGameEngine, TIME_SCALE_OPTIONS } from '../../state/GameContext';

export default function TimeControl() {
	const { sessionSnapshot, timeScale, setTimeScale } = useGameEngine();
	const devMode = sessionSnapshot.game.devMode;

	return (
		<div
			className="flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-3 py-1.5 text-sm font-medium shadow-inner dark:border-white/10 dark:bg-slate-900/60 frosted-surface"
			aria-label="Time control"
		>
			{devMode && (
				<span
					className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white shadow-md"
					title="Developer mode enabled"
				>
					Dev
				</span>
			)}
			<span className="text-xs uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
				Speed
			</span>
			<div
				className="flex overflow-hidden rounded-full border border-white/50 bg-white/40 shadow-sm dark:border-white/10 dark:bg-slate-900/50 frosted-surface"
				role="group"
				aria-label="Game speed"
			>
				{TIME_SCALE_OPTIONS.map((option, index) => {
					const active = option === timeScale;
					return (
						<button
							key={option}
							type="button"
							className={`px-3 py-1 text-sm font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-0 ${
								active
									? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-inner'
									: 'text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/80'
							} ${index > 0 ? 'border-l border-white/40 dark:border-white/10' : ''}`}
							aria-pressed={active}
							onClick={() => {
								if (!active) {
									setTimeScale(option);
								}
							}}
						>
							x{option}
						</button>
					);
				})}
			</div>
		</div>
	);
}
