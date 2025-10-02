import React from 'react';
import { RESOURCES } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { HOVER_CARD_BG } from './constants';

interface ResourceButtonProps {
	resourceKey: keyof typeof RESOURCES;
	value: number;
	onShow: () => void;
	onHide: () => void;
}

const formatDelta = (delta: number) => {
	const absolute = Math.abs(delta);
	const formatted = Number.isInteger(absolute)
		? absolute.toString()
		: absolute.toLocaleString(undefined, {
				maximumFractionDigits: 2,
				minimumFractionDigits: 0,
			});
	return `${delta > 0 ? '+' : '-'}${formatted}`;
};

const ResourceButton: React.FC<ResourceButtonProps> = ({
	resourceKey,
	value,
	onShow,
	onHide,
}) => {
	const info = RESOURCES[resourceKey];
	const changes = useValueChangeIndicators(value);

	return (
		<button
			type="button"
			className="bar-item hoverable cursor-help relative overflow-visible"
			onMouseEnter={onShow}
			onMouseLeave={onHide}
			onFocus={onShow}
			onBlur={onHide}
			onClick={onShow}
			aria-label={`${info.label}: ${value}`}
		>
			{info.icon}
			{value}
			{changes.map((change) => (
				<span
					key={change.id}
					className={`value-change-indicator ${
						change.direction === 'gain'
							? 'value-change-indicator--gain text-emerald-300'
							: 'value-change-indicator--loss text-rose-300'
					}`}
					aria-hidden="true"
				>
					{formatDelta(change.delta)}
				</span>
			))}
		</button>
	);
};

interface ResourceBarProps {
	player: EngineContext['activePlayer'];
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
	const { handleHoverCard, clearHoverCard } = useGameEngine();
	const resourceKeys = Object.keys(RESOURCES) as (keyof typeof RESOURCES)[];
	return (
		<div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
			{resourceKeys.map((k) => {
				const info = RESOURCES[k];
				const v = player.resources[k] ?? 0;
				const showResourceCard = () =>
					handleHoverCard({
						title: `${info.icon} ${info.label}`,
						effects: [],
						requirements: [],
						description: info.description,
						bgClass: HOVER_CARD_BG,
					});
				return (
					<ResourceButton
						key={k}
						resourceKey={k}
						value={v}
						onShow={showResourceCard}
						onHide={clearHoverCard}
					/>
				);
			})}
		</div>
	);
};

export default ResourceBar;
