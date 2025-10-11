import React from 'react';
import { Stat } from '@kingdom-builder/contents';
import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
import { formatStatValue, getStatBreakdownSummary } from '../../utils/stats';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { GENERAL_STAT_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import { getForecastDisplay } from '../../utils/forecast';
import {
	usePopulationMetadata,
	useStatMetadata,
} from '../../contexts/RegistryMetadataContext';
import type { TranslationAssets } from '../../translation/context';
import {
	formatDescriptorSummary,
	formatIconLabel,
	toAssetDisplay,
	toDescriptorDisplay,
	type DescriptorDisplay,
} from './registryDisplays';

interface StatButtonProps {
	statKey: string;
	value: number;
	forecastDelta?: number;
	descriptor: DescriptorDisplay;
	onShow: () => void;
	onHide: () => void;
	assets: TranslationAssets;
}

const formatStatDelta = (
	statKey: string,
	delta: number,
	assets: TranslationAssets,
) => {
	const formatted = formatStatValue(statKey, Math.abs(delta), assets);
	return `${delta > 0 ? '+' : '-'}${formatted}`;
};

const STAT_FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const STAT_FORECAST_BADGE_THEME_CLASS = 'bg-slate-800/70 dark:bg-slate-100/10';

const POPULATION_ARCHETYPE_LABEL = 'Archetypes';

const ROLE_BUTTON_CLASSES = [
	'cursor-help',
	'rounded-full',
	'border',
	'border-white/40',
	'bg-white/40',
	'px-2',
	'py-1',
	'text-xs',
	'font-semibold',
	'text-slate-700',
	'hoverable',
	'dark:border-white/10',
	'dark:bg-slate-900/60',
	'dark:text-slate-100',
].join(' ');

const StatButton: React.FC<StatButtonProps> = ({
	statKey,
	value,
	forecastDelta,
	descriptor,
	onShow,
	onHide,
	assets,
}) => {
	const changes = useValueChangeIndicators(value);
	const formattedValue = formatStatValue(statKey, value, assets);
	const forecastDisplay = getForecastDisplay(forecastDelta, (delta) =>
		formatStatDelta(statKey, delta, assets),
	);
	const ariaLabel = forecastDisplay
		? `${descriptor.label}: ${formattedValue} ${forecastDisplay.label}`
		: `${descriptor.label}: ${formattedValue}`;

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
			{descriptor.icon && <span aria-hidden="true">{descriptor.icon}</span>}
			{formattedValue}
			{forecastDisplay && (
				<span
					className={[
						STAT_FORECAST_BADGE_CLASS,
						STAT_FORECAST_BADGE_THEME_CLASS,
						forecastDisplay.toneClass,
					].join(' ')}
				>
					{forecastDisplay.label}
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
					{formatStatDelta(statKey, change.delta, assets)}
				</span>
			))}
		</button>
	);
};

interface PopulationInfoProps {
	player: PlayerStateSnapshot;
}

const PopulationInfo: React.FC<PopulationInfoProps> = ({ player }) => {
	const { handleHoverCard, clearHoverCard, translationContext } =
		useGameEngine();
	const assets = translationContext.assets;
	const populationMetadata = usePopulationMetadata();
	const statMetadata = useStatMetadata();
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id] ?? {
		resources: {},
		stats: {},
		population: {},
	};
	const popEntries = Object.entries(player.population).filter(
		([, populationCount]) => populationCount > 0,
	);
	const currentPop = popEntries.reduce(
		(sum, [, populationCount]) => sum + populationCount,
		0,
	);
	const popDetails = popEntries.map(([populationRole, populationCount]) => ({
		role: populationRole,
		count: populationCount,
	}));

	const translationPlayer =
		translationContext.activePlayer.id === player.id
			? translationContext.activePlayer
			: translationContext.opponent.id === player.id
				? translationContext.opponent
				: undefined;
	const maxPopulation = (() => {
		const direct = player.stats?.[Stat.maxPopulation];
		if (typeof direct === 'number') {
			return direct;
		}
		return translationPlayer?.stats?.[Stat.maxPopulation] ?? 0;
	})();

	const populationInfo = toAssetDisplay(assets.population, 'population');

	const showGeneralStatCard = () =>
		handleHoverCard({
			title: `${GENERAL_STAT_INFO.icon} ${GENERAL_STAT_INFO.label}`,
			effects: [],
			requirements: [],
			description: GENERAL_STAT_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});

	const showPopulationCard = () =>
		handleHoverCard({
			title: formatIconLabel(populationInfo),
			effects: populationMetadata.list.map((descriptor) =>
				formatDescriptorSummary(toDescriptorDisplay(descriptor)),
			),
			effectsTitle: POPULATION_ARCHETYPE_LABEL,
			requirements: [],
			...(populationInfo.description
				? { description: populationInfo.description }
				: {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});

	const createRoleHoverHandlers = (roleDisplay: DescriptorDisplay) => {
		const showRoleCard = () =>
			handleHoverCard({
				title: formatIconLabel(roleDisplay),
				effects: [],
				requirements: [],
				...(roleDisplay.description
					? { description: roleDisplay.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		const handleRoleFocus = (event: React.SyntheticEvent) => {
			event.stopPropagation();
			showRoleCard();
		};
		const handleRoleLeave = (event: React.SyntheticEvent) => {
			event.stopPropagation();
			showPopulationCard();
		};

		return { handleRoleFocus, handleRoleLeave };
	};

	const populationRoleButtons = popDetails.map(({ role, count }, index) => {
		const descriptor = toDescriptorDisplay(populationMetadata.select(role));
		const { handleRoleFocus: onRoleFocus, handleRoleLeave: onRoleLeave } =
			createRoleHoverHandlers(descriptor);

		return (
			<React.Fragment key={role}>
				{index > 0 && ','}
				<button
					type="button"
					className={ROLE_BUTTON_CLASSES}
					onMouseEnter={onRoleFocus}
					onMouseLeave={onRoleLeave}
					onFocus={onRoleFocus}
					onBlur={onRoleLeave}
					onClick={onRoleFocus}
					aria-label={`${descriptor.label}: ${count}`}
				>
					{descriptor.icon && <span aria-hidden="true">{descriptor.icon}</span>}
					{count}
				</button>
			</React.Fragment>
		);
	});

	const showStatCard = (statKey: string) => {
		const descriptor = toDescriptorDisplay(statMetadata.select(statKey));
		const breakdown = getStatBreakdownSummary(
			statKey,
			player,
			translationContext,
		);
		handleHoverCard({
			title: formatIconLabel(descriptor),
			effects: breakdown,
			effectsTitle: 'Breakdown',
			requirements: [],
			...(descriptor.description
				? { description: descriptor.description }
				: {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	};

	return (
		<div className="info-bar stat-bar">
			<button
				type="button"
				className="info-bar__icon hoverable cursor-help"
				aria-label={`${GENERAL_STAT_INFO.label} overview`}
				onMouseEnter={showGeneralStatCard}
				onMouseLeave={clearHoverCard}
				onFocus={showGeneralStatCard}
				onBlur={clearHoverCard}
				onClick={showGeneralStatCard}
			>
				{GENERAL_STAT_INFO.icon}
			</button>
			<div
				role="button"
				tabIndex={0}
				className="bar-item hoverable cursor-help"
				onMouseEnter={showPopulationCard}
				onMouseLeave={clearHoverCard}
				onFocus={showPopulationCard}
				onBlur={clearHoverCard}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						showPopulationCard();
					}
				}}
			>
				{populationInfo.icon && (
					<span aria-hidden="true">{populationInfo.icon}</span>
				)}
				{currentPop}/{maxPopulation}
				{popDetails.length > 0 && (
					<>
						{' ('}
						{populationRoleButtons}
						{')'}
					</>
				)}
			</div>
			{Object.entries(player.stats)
				.filter(([statKey, statValue]) => {
					if (statKey === Stat.maxPopulation) {
						return false;
					}
					if (statValue !== 0) {
						return true;
					}
					return Boolean(player.statsHistory?.[statKey]);
				})
				.map(([statKey, statValue]) => {
					const descriptor = toDescriptorDisplay(statMetadata.select(statKey));
					const props: StatButtonProps = {
						statKey,
						value: statValue,
						descriptor,
						onShow: () => showStatCard(statKey),
						onHide: clearHoverCard,
						assets,
					};
					const nextTurnStat = playerForecast.stats[statKey];
					if (typeof nextTurnStat === 'number') {
						props.forecastDelta = nextTurnStat;
					}
					return <StatButton key={statKey} {...props} />;
				})}
		</div>
	);
};

export default PopulationInfo;
