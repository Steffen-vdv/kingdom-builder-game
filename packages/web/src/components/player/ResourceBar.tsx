import React from 'react';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { GENERAL_RESOURCE_ICON } from '../../icons';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import { buildTierEntries } from './buildTierEntries';
import type { SummaryGroup } from '../../translation/content/types';

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
	const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
	const resourceKeys = Object.keys(RESOURCES) as ResourceKey[];
	const happinessKey = ctx.services.tieredResource.resourceKey as ResourceKey;
	const tiers = ctx.services.rules.tierDefinitions;
	const showHappinessCard = (value: number) => {
		const activeTier = ctx.services.tieredResource.definition(value);
		const { summaries, activeEntry } = buildTierEntries(
			tiers,
			activeTier?.id,
			ctx,
		);
		const info = RESOURCES[happinessKey];
		const activeIndex = summaries.findIndex((summary) => summary.active);
		const higherSummary =
			activeIndex > 0 ? summaries[activeIndex - 1] : undefined;
		const lowerSummary =
			activeIndex >= 0 && activeIndex + 1 < summaries.length
				? summaries[activeIndex + 1]
				: undefined;
		const groupedEntries: SummaryGroup[] = [];
		if (activeEntry) {
			groupedEntries.push({
				title: 'Current tier',
				items: [activeEntry.entry],
			});
		} else {
			groupedEntries.push({
				title: 'Current tier',
				items: ['No active tier'],
			});
		}
		if (higherSummary) {
			groupedEntries.push({
				title: 'If happiness rises',
				items: [higherSummary.entry],
			});
		}
		if (lowerSummary) {
			groupedEntries.push({
				title: 'If happiness falls',
				items: [lowerSummary.entry],
			});
		}
		handleHoverCard({
			title: `${info.icon} ${info.label}`,
			effects: groupedEntries,
			effectsTitle: `Happiness thresholds (current: ${value})`,
			requirements: [],
			bgClass: PLAYER_INFO_CARD_BG,
		});
	};
	const showGeneralResourceCard = () =>
		handleHoverCard({
			title: `${GENERAL_RESOURCE_INFO.icon} ${GENERAL_RESOURCE_INFO.label}`,
			effects: [],
			requirements: [],
			description: GENERAL_RESOURCE_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});

	return (
		<div className="info-bar resource-bar">
			<button
				type="button"
				className="info-bar__icon hoverable cursor-help"
				aria-label={`${GENERAL_RESOURCE_INFO.label} overview`}
				onMouseEnter={showGeneralResourceCard}
				onMouseLeave={clearHoverCard}
				onFocus={showGeneralResourceCard}
				onBlur={clearHoverCard}
				onClick={showGeneralResourceCard}
			>
				{GENERAL_RESOURCE_ICON}
			</button>
			{resourceKeys.map((resourceKey) => {
				const resourceInfo = RESOURCES[resourceKey];
				const resourceValue = player.resources[resourceKey] ?? 0;
				const showResourceCard = () => {
					if (resourceKey === happinessKey) {
						showHappinessCard(resourceValue);
						return;
					}
					handleHoverCard({
						title: `${resourceInfo.icon} ${resourceInfo.label}`,
						effects: [],
						requirements: [],
						description: resourceInfo.description,
						bgClass: PLAYER_INFO_CARD_BG,
					});
				};
				return (
					<ResourceButton
						key={resourceKey}
						resourceKey={resourceKey}
						value={resourceValue}
						onShow={showResourceCard}
						onHide={clearHoverCard}
					/>
				);
			})}
		</div>
	);
};

export default ResourceBar;
