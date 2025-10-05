import React from 'react';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { GENERAL_RESOURCE_ICON } from '../../icons';
import { GENERAL_RESOURCE_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import { buildTierEntries } from './buildTierEntries';
import type { SummaryGroup } from '../../translation/content/types';

interface ResourceButtonProps {
	resourceKey: keyof typeof RESOURCES;
	value: number;
	forecastDelta?: number;
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

const RESOURCE_FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const RESOURCE_FORECAST_BADGE_THEME_CLASS =
	'bg-slate-800/70 text-white dark:bg-slate-100/10';

const ResourceButton: React.FC<ResourceButtonProps> = ({
	resourceKey,
	value,
	forecastDelta,
	onShow,
	onHide,
}) => {
	const info = RESOURCES[resourceKey];
	const changes = useValueChangeIndicators(value);
	const forecastLabel =
		typeof forecastDelta === 'number' && forecastDelta !== 0
			? `(${formatDelta(forecastDelta)} next turn)`
			: undefined;
	const ariaLabel = forecastLabel
		? `${info.label}: ${value} ${forecastLabel}`
		: `${info.label}: ${value}`;

	return (
		<button
			type="button"
			className="bar-item hoverable cursor-help relative overflow-visible"
			onMouseEnter={onShow}
			onMouseLeave={onHide}
			onFocus={onShow}
			onBlur={onHide}
			onClick={onShow}
			aria-label={ariaLabel}
		>
			{info.icon}
			{value}
			{forecastLabel && (
				<span
					className={`${RESOURCE_FORECAST_BADGE_CLASS} ${RESOURCE_FORECAST_BADGE_THEME_CLASS}`}
				>
					{forecastLabel}
				</span>
			)}
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
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id] ?? {
		resources: {},
		stats: {},
		population: {},
	};
	const resourceKeys = Object.keys(RESOURCES) as ResourceKey[];
	const happinessKey = ctx.services.tieredResource.resourceKey as ResourceKey;
	const tiers = ctx.services.rules.tierDefinitions;
	const showHappinessCard = (value: number) => {
		const activeTier = ctx.services.tieredResource.definition(value);
		const { summaries } = buildTierEntries(tiers, activeTier?.id, ctx);
		const info = RESOURCES[happinessKey];
		const activeIndex = summaries.findIndex((summary) => summary.active);
		const higherSummary =
			activeIndex > 0 ? summaries[activeIndex - 1] : undefined;
		const lowerSummary =
			activeIndex >= 0 && activeIndex + 1 < summaries.length
				? summaries[activeIndex + 1]
				: undefined;
		const formatTierTitle = (
			summary: (typeof summaries)[number],
			orientation: 'higher' | 'current' | 'lower',
		) => {
			const parts = [summary.icon, summary.name]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			const baseTitle = parts.length
				? parts
				: (summary.entry.title?.trim() ?? '');
			if (orientation === 'current') {
				return baseTitle;
			}
			const thresholdValue =
				orientation === 'higher'
					? summary.rangeMin
					: (summary.rangeMax ?? summary.rangeMin);
			if (thresholdValue === undefined) {
				return baseTitle;
			}
			const suffix = `${thresholdValue}${orientation === 'higher' ? '+' : '-'}`;
			const rangeParts = [info.icon, suffix]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			if (!rangeParts.length) {
				return baseTitle;
			}
			return `${baseTitle} (${rangeParts})`;
		};
		const tierEntries: SummaryGroup[] = [];
		if (higherSummary) {
			tierEntries.push({
				...higherSummary.entry,
				title: formatTierTitle(higherSummary, 'higher'),
			});
		}
		if (activeIndex >= 0) {
			const currentSummary = summaries[activeIndex];
			if (currentSummary) {
				tierEntries.push({
					...currentSummary.entry,
					title: formatTierTitle(currentSummary, 'current'),
				});
			} else {
				tierEntries.push({ title: 'No active tier', items: [] });
			}
		} else {
			tierEntries.push({ title: 'No active tier', items: [] });
		}
		if (lowerSummary) {
			tierEntries.push({
				...lowerSummary.entry,
				title: formatTierTitle(lowerSummary, 'lower'),
			});
		}
		handleHoverCard({
			title: `${info.icon} ${info.label}`,
			effects: tierEntries,
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
				const nextTurnDelta = playerForecast.resources[resourceKey];
				const buttonProps: ResourceButtonProps = {
					resourceKey,
					value: resourceValue,
					onShow: showResourceCard,
					onHide: clearHoverCard,
				};
				if (typeof nextTurnDelta === 'number') {
					buttonProps.forecastDelta = nextTurnDelta;
				}
				return <ResourceButton key={resourceKey} {...buttonProps} />;
			})}
		</div>
	);
};

export default ResourceBar;
