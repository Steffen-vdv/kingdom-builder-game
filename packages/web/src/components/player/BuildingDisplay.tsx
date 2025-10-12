import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';

interface BuildingDisplayProps {
	player: SessionPlayerStateSnapshot;
}

const BuildingDisplay: React.FC<BuildingDisplayProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard } =
		useGameEngine();
	if (player.buildings.length === 0) {
		return null;
	}
	const animateBuildings = useAnimate<HTMLDivElement>();
	return (
		<div ref={animateBuildings} className="mt-3 flex w-full flex-wrap gap-3">
			{player.buildings.map((buildingId) => {
				const hasDefinition = translationContext.buildings.has(buildingId);
				const definition = hasDefinition
					? translationContext.buildings.get(buildingId)
					: undefined;
				const name = definition?.name || buildingId;
				const icon = definition?.icon || '';
				const upkeep = definition?.upkeep;
				const title = `${icon} ${name}`;
				return (
					<div
						key={buildingId}
						className="panel-card flex min-w-[9rem] flex-col items-center gap-1 px-4 py-3 text-center text-sm font-semibold text-slate-700 hoverable cursor-help dark:text-slate-100"
						onMouseEnter={() => {
							const full = describeContent(
								'building',
								buildingId,
								translationContext,
								{
									installed: true,
								},
							);
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
