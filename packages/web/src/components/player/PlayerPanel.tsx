import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import ResourceBar from './ResourceBar';
import PopulationInfo from './PopulationInfo';
import LandDisplay from './LandDisplay';
import BuildingDisplay from './BuildingDisplay';
import PassiveDisplay from './PassiveDisplay';
import { useAnimate } from '../../utils/useAutoAnimate';

interface PlayerPanelProps {
	player: EngineContext['activePlayer'];
	className?: string;
	isActive?: boolean;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
	player,
	className = '',
	isActive = false,
}) => {
	const animateBar = useAnimate<HTMLDivElement>();
	const animateSections = useAnimate<HTMLDivElement>();
	return (
		<div
			className={`player-panel flex h-full flex-col gap-2 text-slate-800 dark:text-slate-100 ${className}`}
		>
			<h3 className="text-lg font-semibold tracking-tight">
				{isActive && (
					<span role="img" aria-label="active player" className="mr-1">
						👑
					</span>
				)}
				{player.name}
			</h3>
			<div
				ref={animateBar}
				className="panel-card flex w-fit flex-wrap items-center gap-3 px-4 py-3"
			>
				<ResourceBar player={player} />
				<PopulationInfo player={player} />
			</div>
			<div ref={animateSections} className="flex flex-col gap-2">
				<LandDisplay player={player} />
				<BuildingDisplay player={player} />
				<PassiveDisplay player={player} />
			</div>
		</div>
	);
};

export default PlayerPanel;
