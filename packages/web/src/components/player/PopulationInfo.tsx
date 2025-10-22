import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { getStatBreakdownSummary } from '../../utils/stats';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_STAT_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import {
	usePopulationMetadata,
	useStatMetadata,
} from '../../contexts/RegistryMetadataContext';
import {
	formatDescriptorSummary,
	formatIconLabel,
	toAssetDisplay,
	toDescriptorDisplay,
	type DescriptorDisplay,
} from './registryDisplays';
import StatButton from './StatButton';

const createDisplayMap = (descriptors: DescriptorDisplay[]) =>
	new Map(
		descriptors.map((descriptor) => [descriptor.id, descriptor] as const),
	);

const POPULATION_ARCHETYPE_LABEL = 'Archetypes';
const MAX_POPULATION_FALLBACK_KEY = 'maxPopulation';

const NORMALIZE_PATTERN = /[\s_-]+/g;
const POPULATION_KEYWORDS = ['population', 'subject', 'inhabitant'];
const CAPACITY_KEYWORDS = ['max', 'cap', 'capacity', 'limit', 'maximum'];

const normalizeDescriptor = (value: string | undefined): string | undefined =>
	value?.toLowerCase().replace(NORMALIZE_PATTERN, ' ').trim();

const matchesPopulationCapacity = (value: string | undefined): boolean => {
	const normalized = normalizeDescriptor(value);
	if (!normalized) {
		return false;
	}
	const hasPopulationKeyword = POPULATION_KEYWORDS.some((keyword) =>
		normalized.includes(keyword),
	);
	if (!hasPopulationKeyword) {
		return false;
	}
	return CAPACITY_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const resolveMaxPopulationKey = (
	descriptors: DescriptorDisplay[],
	assets: Readonly<Record<string, { label?: string }>>,
	player: SessionPlayerStateSnapshot,
): string => {
	for (const descriptor of descriptors) {
		if (
			matchesPopulationCapacity(descriptor.id) ||
			matchesPopulationCapacity(descriptor.label)
		) {
			return descriptor.id;
		}
	}
	for (const [statKey, info] of Object.entries(assets)) {
		if (
			matchesPopulationCapacity(statKey) ||
			matchesPopulationCapacity(info?.label)
		) {
			return statKey;
		}
	}
	for (const statKey of Object.keys(player.stats ?? {})) {
		if (matchesPopulationCapacity(statKey)) {
			return statKey;
		}
	}
	for (const statKey of Object.keys(player.statsHistory ?? {})) {
		if (matchesPopulationCapacity(statKey)) {
			return statKey;
		}
	}
	return MAX_POPULATION_FALLBACK_KEY;
};

const ROLE_BUTTON_CLASSES = [
	'cursor-help rounded-full border border-white/40 bg-white/40 px-2 py-1',
	'text-xs font-semibold text-slate-700 hoverable',
	'dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100',
].join(' ');

interface PopulationInfoProps {
	player: SessionPlayerStateSnapshot;
}

const PopulationInfo: React.FC<PopulationInfoProps> = ({ player }) => {
	const { handleHoverCard, clearHoverCard, translationContext } =
		useGameEngine();
	const assets = translationContext.assets;
	const populationMetadata = usePopulationMetadata();
	const statMetadata = useStatMetadata();
	const populationDescriptors = React.useMemo(
		() => populationMetadata.list.map(toDescriptorDisplay),
		[populationMetadata],
	);
	const populationDisplayMap = React.useMemo(
		() => createDisplayMap(populationDescriptors),
		[populationDescriptors],
	);
	const statDescriptors = React.useMemo(
		() => statMetadata.list.map(toDescriptorDisplay),
		[statMetadata],
	);
	const statDisplayMap = React.useMemo(
		() => createDisplayMap(statDescriptors),
		[statDescriptors],
	);
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
	const hasPopulationRoles = popEntries.length > 0;

	const translationPlayer =
		translationContext.activePlayer.id === player.id
			? translationContext.activePlayer
			: translationContext.opponent.id === player.id
				? translationContext.opponent
				: undefined;
	const maxPopulationKey = React.useMemo(
		() =>
			resolveMaxPopulationKey(
				statDescriptors,
				translationContext.assets.stats,
				player,
			),
		[player, statDescriptors, translationContext.assets.stats],
	);

	const maxPopulation = (() => {
		const direct = player.stats?.[maxPopulationKey];
		if (typeof direct === 'number') {
			return direct;
		}
		return translationPlayer?.stats?.[maxPopulationKey] ?? 0;
	})();

	const populationInfo = React.useMemo(
		() => toAssetDisplay(assets.population, 'population'),
		[assets.population],
	);

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
			effects: populationDescriptors.map((descriptor) =>
				formatDescriptorSummary(descriptor),
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

	const populationRoleButtons = popEntries.map(([role, count], index) => {
		const descriptor =
			populationDisplayMap.get(role) ??
			toDescriptorDisplay(populationMetadata.select(role));
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

	const showStatCard = React.useCallback(
		(statKey: string) => {
			const descriptor =
				statDisplayMap.get(statKey) ??
				toDescriptorDisplay(statMetadata.select(statKey));
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
		},
		[handleHoverCard, player, statDisplayMap, statMetadata, translationContext],
	);

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
				{hasPopulationRoles && (
					<>
						{' ('}
						{populationRoleButtons}
						{')'}
					</>
				)}
			</div>
			{Object.entries(player.stats)
				.filter(([statKey, statValue]) => {
					if (statKey === maxPopulationKey) {
						return false;
					}
					if (statValue !== 0) {
						return true;
					}
					return Boolean(player.statsHistory?.[statKey]);
				})
				.map(([statKey, statValue]) => {
					const descriptor =
						statDisplayMap.get(statKey) ??
						toDescriptorDisplay(statMetadata.select(statKey));
					const nextTurnStat = playerForecast.stats[statKey];
					return (
						<StatButton
							key={statKey}
							statKey={statKey}
							value={statValue}
							label={descriptor.label}
							{...(descriptor.icon !== undefined
								? { icon: descriptor.icon }
								: {})}
							{...(typeof nextTurnStat === 'number'
								? { forecastDelta: nextTurnStat }
								: {})}
							onShow={showStatCard}
							onHide={clearHoverCard}
							assets={assets}
						/>
					);
				})}
		</div>
	);
};

export default PopulationInfo;
