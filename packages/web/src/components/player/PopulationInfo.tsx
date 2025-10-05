import React from 'react';
import {
	POPULATION_ROLES,
	STATS,
	POPULATION_INFO,
	POPULATION_ARCHETYPE_INFO,
} from '@kingdom-builder/contents';
import { formatStatValue, getStatBreakdownSummary } from '../../utils/stats';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { GENERAL_STAT_INFO, PLAYER_INFO_CARD_BG } from './infoCards';

interface StatButtonProps {
	statKey: keyof typeof STATS;
	value: number;
	forecastDelta?: number;
	onShow: () => void;
	onHide: () => void;
}

const formatStatDelta = (statKey: keyof typeof STATS, delta: number) => {
	const formatted = formatStatValue(statKey, Math.abs(delta));
	return `${delta > 0 ? '+' : '-'}${formatted}`;
};

const STAT_FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const STAT_FORECAST_BADGE_THEME_CLASS =
	'bg-slate-800/70 text-white dark:bg-slate-100/10';

const StatButton: React.FC<StatButtonProps> = ({
	statKey,
	value,
	forecastDelta,
	onShow,
	onHide,
}) => {
	const info = STATS[statKey];
	const changes = useValueChangeIndicators(value);
	const formattedValue = formatStatValue(statKey, value);
	const forecastLabel =
		typeof forecastDelta === 'number' && forecastDelta !== 0
			? `(${formatStatDelta(statKey, forecastDelta)} next turn)`
			: undefined;
	const ariaLabel = forecastLabel
		? `${info.label}: ${formattedValue} ${forecastLabel}`
		: `${info.label}: ${formattedValue}`;

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
			{formattedValue}
			{forecastLabel && (
				<span
					className={`${STAT_FORECAST_BADGE_CLASS} ${STAT_FORECAST_BADGE_THEME_CLASS}`}
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
					{formatStatDelta(statKey, change.delta)}
				</span>
			))}
		</button>
	);
};

interface PopulationInfoProps {
	player: EngineContext['activePlayer'];
}

const PopulationInfo: React.FC<PopulationInfoProps> = ({ player }) => {
	const { handleHoverCard, clearHoverCard, ctx } = useGameEngine();
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
			title: `${POPULATION_INFO.icon} ${POPULATION_INFO.label}`,
			effects: Object.values(POPULATION_ROLES).map(
				(r) => `${r.icon} ${r.label} - ${r.description}`,
			),
			effectsTitle: POPULATION_ARCHETYPE_INFO.label,
			requirements: [],
			description: POPULATION_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});

	const showStatCard = (statKey: string) => {
		const info = STATS[statKey as keyof typeof STATS];
		if (!info) {
			return;
		}
		const breakdown = getStatBreakdownSummary(statKey, player, ctx);
		handleHoverCard({
			title: `${info.icon} ${info.label}`,
			effects: breakdown,
			effectsTitle: 'Breakdown',
			requirements: [],
			description: info.description,
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
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						showPopulationCard();
					}
				}}
			>
				{POPULATION_INFO.icon}
				{currentPop}/{player.maxPopulation}
				{popDetails.length > 0 && (
					<>
						{' ('}
						{popDetails.map(({ role, count }, i) => {
							const info =
								POPULATION_ROLES[role as keyof typeof POPULATION_ROLES];
							return (
								<React.Fragment key={role}>
									{i > 0 && ','}
									<button
										type="button"
										className="cursor-help rounded-full border border-white/40 bg-white/40 px-2 py-1 text-xs font-semibold text-slate-700 hoverable dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
										onMouseEnter={(e) => {
											e.stopPropagation();
											handleHoverCard({
												title: `${info.icon} ${info.label}`,
												effects: [],
												requirements: [],
												description: info.description,
												bgClass: PLAYER_INFO_CARD_BG,
											});
										}}
										onMouseLeave={(e) => {
											e.stopPropagation();
											showPopulationCard();
										}}
										onFocus={(e) => {
											e.stopPropagation();
											handleHoverCard({
												title: `${info.icon} ${info.label}`,
												effects: [],
												requirements: [],
												description: info.description,
												bgClass: PLAYER_INFO_CARD_BG,
											});
										}}
										onBlur={(e) => {
											e.stopPropagation();
											showPopulationCard();
										}}
										onClick={(e) => {
											e.stopPropagation();
											handleHoverCard({
												title: `${info.icon} ${info.label}`,
												effects: [],
												requirements: [],
												description: info.description,
												bgClass: PLAYER_INFO_CARD_BG,
											});
										}}
									>
										{info.icon}
										{count}
									</button>
								</React.Fragment>
							);
						})}
						{')'}
					</>
				)}
			</div>
			{Object.entries(player.stats)
				.filter(([statKey, statValue]) => {
					const info = STATS[statKey as keyof typeof STATS];
					return (
						!info.capacity &&
						(statValue !== 0 || player.statsHistory?.[statKey])
					);
				})
				.map(([statKey, statValue]) => {
					const props: StatButtonProps = {
						statKey: statKey as keyof typeof STATS,
						value: statValue,
						onShow: () => showStatCard(statKey),
						onHide: clearHoverCard,
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
