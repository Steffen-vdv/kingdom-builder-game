import React, { useEffect, useRef } from 'react';
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
			<h3 className="flex items-center justify-between text-lg font-semibold tracking-tight">
				{isActive && (
					<span role="img" aria-label="active player" className="mr-1">
						👑
					</span>
				)}
				{player.name}
			</h3>
			<div
				ref={animateBar}
				className="panel-card flex w-full items-center gap-4 overflow-hidden px-5 py-4"
			>
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<ResourceBar player={player} />
				</div>
				<div className="flex flex-none items-center gap-2">
					<PopulationInfo player={player} />
				</div>
			</div>
			<div ref={animateSections} className="flex flex-col gap-4">
				<LandDisplay player={player} />
				<BuildingDisplay player={player} />
				<PassiveDisplay player={player} />
			</div>
		</div>
	);
};

export default PlayerPanel;
