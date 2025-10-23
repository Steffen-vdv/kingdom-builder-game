import { useEffect, useRef, type FC } from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import ResourceBar from './ResourceBar';
import PopulationInfo from './PopulationInfo';
import LandDisplay from './LandDisplay';
import BuildingDisplay from './BuildingDisplay';
import PassiveDisplay from './PassiveDisplay';
import { useAnimate } from '../../utils/useAutoAnimate';
import ResourceHud from '../resources/ResourceHud';

const PANEL_CARD_CLASS = [
	'panel-card',
	'flex',
	'w-full',
	'flex-col',
	'items-stretch',
	'gap-2',
	'px-4',
	'py-3',
].join(' ');

interface PlayerPanelProps {
	player: SessionPlayerStateSnapshot;
	className?: string;
	isActive?: boolean;
	onHeightChange?: (height: number) => void;
}

const PlayerPanel: FC<PlayerPanelProps> = ({
	player,
	className = '',
	isActive = false,
	onHeightChange,
}) => {
	const panelRef = useRef<HTMLDivElement | null>(null);
	const heightCallbackRef = useRef<typeof onHeightChange | null>(null);
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
	const panelClassName = [
		'player-panel flex h-auto min-h-[320px] flex-col gap-2',
		'self-start text-slate-800 dark:text-slate-100',
		className,
	]
		.filter(Boolean)
		.join(' ');
	const resourceValues = player.values;
	const showResourceHud = Boolean(
		resourceValues && Object.keys(resourceValues).length > 0,
	);
	return (
		<div ref={panelRef} className={panelClassName}>
			<h3 className="text-lg font-semibold tracking-tight">
				{isActive && (
					<span role="img" aria-label="active player" className="mr-1">
						👑
					</span>
				)}
				{player.name}
			</h3>
			<div ref={animateBar} className={PANEL_CARD_CLASS}>
				{showResourceHud ? (
					<ResourceHud player={player} />
				) : (
					<ResourceBar player={player} />
				)}
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
