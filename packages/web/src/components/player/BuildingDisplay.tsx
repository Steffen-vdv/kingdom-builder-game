import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';

interface BuildingDisplayProps {
	player: EngineContext['activePlayer'];
}

const BuildingDisplay: React.FC<BuildingDisplayProps> = ({ player }) => {
	const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
	if (player.buildings.size === 0) return null;
	const animateBuildings = useAnimate<HTMLDivElement>();
	return (
		<div ref={animateBuildings} className="flex w-full flex-wrap gap-3">
			{Array.from(player.buildings).map((b) => {
				const name = ctx.buildings.get(b)?.name || b;
				const icon = ctx.buildings.get(b)?.icon || '';
				const upkeep = ctx.buildings.get(b)?.upkeep;
				const title = `${icon} ${name}`;
				return (
					<div
						key={b}
						className="panel-card flex min-w-[9rem] flex-col items-center gap-1 px-4 py-3 text-center text-sm font-semibold text-slate-700 hoverable dark:text-slate-100"
						onMouseEnter={() => {
							const full = describeContent('building', b, ctx, {
								installed: true,
							});
							const { effects, description } = splitSummary(full);
							handleHoverCard({
								title,
								effects,
								requirements: [],
								upkeep,
								...(description && { description }),
								bgClass:
									'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
							});
						}}
						onMouseLeave={clearHoverCard}
					>
						<span className="font-medium">
							{icon} {name}
						</span>
					</div>
				);
			})}
		</div>
	);
};

export default BuildingDisplay;
