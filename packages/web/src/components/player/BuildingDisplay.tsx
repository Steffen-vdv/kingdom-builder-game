import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import { HOVER_CARD_BG } from './constants';

interface BuildingDisplayProps {
	player: EngineContext['activePlayer'];
}

const BuildingDisplay: React.FC<BuildingDisplayProps> = ({ player }) => {
	const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
	if (player.buildings.size === 0) return null;
	const animateBuildings = useAnimate<HTMLDivElement>();
	return (
		<section className="panel-section">
			<header className="panel-section__heading">
				<span className="text-base leading-none">🏰</span>
				<span className="panel-section__label">Buildings</span>
			</header>
			<div ref={animateBuildings} className="flex w-full flex-wrap gap-3">
				{Array.from(player.buildings).map((b) => {
					const name = ctx.buildings.get(b)?.name || b;
					const icon = ctx.buildings.get(b)?.icon || '';
					const upkeep = ctx.buildings.get(b)?.upkeep;
					const title = `${icon} ${name}`;
					return (
						<div
							key={b}
							className="panel-chip hoverable"
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
									bgClass: HOVER_CARD_BG,
								});
							}}
							onMouseLeave={clearHoverCard}
						>
							<span className="text-base leading-none">{icon}</span>
							<span className="font-semibold">{name}</span>
						</div>
					);
				})}
			</div>
		</section>
	);
};

export default BuildingDisplay;
