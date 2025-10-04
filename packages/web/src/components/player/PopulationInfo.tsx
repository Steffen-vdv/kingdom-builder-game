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
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { GENERAL_STAT_INFO, PLAYER_INFO_CARD_BG } from './infoCards';

interface StatButtonProps {
	statKey: keyof typeof STATS;
	value: number;
	onShow: () => void;
	onHide: () => void;
}

const formatStatDelta = (statKey: keyof typeof STATS, delta: number) => {
	const formatted = formatStatValue(statKey, Math.abs(delta));
	return `${delta > 0 ? '+' : '-'}${formatted}`;
};

const StatButton: React.FC<StatButtonProps> = ({
	statKey,
	value,
	onShow,
	onHide,
}) => {
	const info = STATS[statKey];
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
		>
			{info.icon}
			{formatStatValue(statKey, value)}
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
	const popEntries = Object.entries(player.population).filter(([, v]) => v > 0);
	const currentPop = popEntries.reduce((sum, [, v]) => sum + v, 0);
	const popDetails = popEntries.map(([role, count]) => ({ role, count }));

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
				.filter(([k, v]) => {
					const info = STATS[k as keyof typeof STATS];
					return !info.capacity && (v !== 0 || player.statsHistory?.[k]);
				})
				.map(([k, v]) => (
					<StatButton
						key={k}
						statKey={k as keyof typeof STATS}
						value={v}
						onShow={() => showStatCard(k)}
						onHide={clearHoverCard}
					/>
				))}
		</div>
	);
};

export default PopulationInfo;
