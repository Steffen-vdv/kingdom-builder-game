import React, { useEffect, useRef } from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import ResourceBar from './ResourceBar';
import PopulationInfo from './PopulationInfo';
import LandDisplay from './LandDisplay';
import BuildingDisplay from './BuildingDisplay';
import PassiveDisplay, { getVisiblePassiveEntries } from './PassiveDisplay';
import { useAnimate } from '../../utils/useAutoAnimate';
import { useGameEngine } from '../../state/GameContext';

interface SectionCardProps {
	title: string;
	children: React.ReactNode;
	className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({
	title,
	className = '',
	children,
}) => (
	<section
		className={`panel-card flex flex-col gap-3 rounded-2xl px-4 py-4 backdrop-blur-sm ${className}`}
	>
		<h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-300">
			{title}
		</h4>
		{children}
	</section>
);

const PASSIVE_SECTION_TITLE = 'Passives & Modifiers';

interface PlayerPanelProps {
	player: EngineContext['activePlayer'];
	className?: string;
	isActive?: boolean;
	onHeightChange?: (height: number) => void;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
	player,
	className = '',
	isActive = false,
	onHeightChange,
}) => {
	const panelRef = useRef<HTMLDivElement | null>(null);
	const heightCallbackRef = useRef<typeof onHeightChange>();
	const animateBar = useAnimate<HTMLDivElement>();
	const animateSections = useAnimate<HTMLDivElement>();
	const { ctx } = useGameEngine();
	const passiveEntries = getVisiblePassiveEntries(player, ctx);
	const hasLands = player.lands.length > 0;
	const hasBuildings = player.buildings.size > 0;
	const hasPassives = passiveEntries.length > 0;
	useEffect(() => {
		heightCallbackRef.current = onHeightChange;
	}, [onHeightChange]);
	useEffect(() => {
		const node = panelRef.current;
		if (!node) {
			return;
		}

		let frame = 0;
		const updateHeight = () => {
			if (!panelRef.current || !heightCallbackRef.current) {
				return;
			}
			heightCallbackRef.current(
				panelRef.current.getBoundingClientRect().height,
			);
		};

		updateHeight();

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', updateHeight);
			return () => {
				window.removeEventListener('resize', updateHeight);
			};
		}

		const observer = new ResizeObserver(() => {
			frame = window.requestAnimationFrame(updateHeight);
		});

		observer.observe(node);

		return () => {
			observer.disconnect();
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
		};
	}, []);
	return (
		<div
			ref={panelRef}
			className={`player-panel flex min-h-[320px] flex-col gap-4 text-slate-800 dark:text-slate-100 ${className}`}
		>
			<h3 className="text-lg font-semibold tracking-tight">
				{isActive && (
					<span role="img" aria-label="active player" className="mr-1">
						👑
					</span>
				)}
				{player.name}
			</h3>
			<SectionCard title="Resources & Stats">
				<div
					ref={animateBar}
					className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1 pt-1 text-sm sm:text-base"
				>
					<div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
						<ResourceBar player={player} />
					</div>
					<div className="hidden h-6 w-px shrink-0 bg-white/50 dark:bg-white/10 sm:block" />
					<div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
						<PopulationInfo player={player} />
					</div>
				</div>
			</SectionCard>
			<div ref={animateSections} className="flex flex-col gap-4">
				{hasLands && (
					<SectionCard title="Territories">
						<LandDisplay player={player} />
					</SectionCard>
				)}
				{hasBuildings && (
					<SectionCard title="Structures">
						<BuildingDisplay player={player} />
					</SectionCard>
				)}
				{hasPassives && (
					<SectionCard title={PASSIVE_SECTION_TITLE}>
						{/* prettier-ignore */}
						<PassiveDisplay
                                                        player={player}
                                                        entries={passiveEntries}
                                                />
					</SectionCard>
				)}
			</div>
		</div>
	);
};

export default PlayerPanel;
