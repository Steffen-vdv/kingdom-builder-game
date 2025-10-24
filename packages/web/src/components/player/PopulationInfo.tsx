import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_STAT_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import {
	buildResourceV2DisplayBuckets,
	createLabelResolver,
	type ResourceV2DisplayEntry,
	type ResourceV2GroupDisplay,
} from './resourceV2Display';
import {
	buildResourceV2HoverSections,
	formatResourceV2Value,
	type ResourceV2MetadataSnapshot,
} from '../../translation/resourceV2';
import {
	usePopulationMetadata,
	useResourceMetadata,
	useStatMetadata,
} from '../../contexts/RegistryMetadataContext';
import StatButton from './StatButton';
import { getStatBreakdownSummary } from '../../utils/stats';
import type { Summary } from '../../translation/content/types';

const ROLE_BUTTON_CLASSES = [
	'cursor-help rounded-full border border-white/40 bg-white/40 px-2 py-1',
	'text-xs font-semibold text-slate-700 hoverable',
	'dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100',
].join(' ');

interface PopulationInfoProps {
	player: SessionPlayerStateSnapshot;
}

function formatMetadataLabel(metadata: ResourceV2MetadataSnapshot): string {
	const label = (metadata.label ?? metadata.id).trim();
	if (metadata.icon && metadata.icon.trim().length > 0) {
		return `${metadata.icon} ${label}`.trim();
	}
	return label;
}

function buildPopulationHoverSections(group: ResourceV2GroupDisplay): Summary {
	const sections = buildResourceV2HoverSections(group.metadata, group.snapshot);
	const roleItems = group.children
		.map((child) => {
			const summary = formatMetadataLabel(child.metadata);
			const description = child.metadata.description?.trim();
			return description && description.length > 0
				? `${summary} - ${description}`
				: summary;
		})
		.filter((item) => item.length > 0);
	if (roleItems.length > 0) {
		sections.push({ title: 'Archetypes', items: roleItems });
	}
	return sections;
}

function formatRoleValue(entry: ResourceV2DisplayEntry): string {
	return formatResourceV2Value(entry.metadata, entry.snapshot.current);
}

const PopulationInfo: React.FC<PopulationInfoProps> = ({ player }) => {
	const { handleHoverCard, clearHoverCard, translationContext } =
		useGameEngine();
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];
	const resourceMetadata = useResourceMetadata();
	const statMetadata = useStatMetadata();
	const populationMetadata = usePopulationMetadata();

	const resolvers = React.useMemo(
		() => ({
			resources: createLabelResolver(resourceMetadata.list),
			stats: createLabelResolver(statMetadata.list),
			population: createLabelResolver(populationMetadata.list),
		}),
		[populationMetadata, resourceMetadata, statMetadata],
	);

	const displayBuckets = React.useMemo(
		() =>
			buildResourceV2DisplayBuckets({
				catalog: translationContext.resourcesV2,
				metadata: translationContext.resourceMetadataV2,
				groupMetadata: translationContext.resourceGroupMetadataV2,
				player,
				forecast: playerForecast,
				signedGains: translationContext.signedResourceGains,
				legacyResolvers: resolvers,
			}),
		[
			player,
			playerForecast,
			resolvers,
			translationContext.resourceGroupMetadataV2,
			translationContext.resourceMetadataV2,
			translationContext.resourcesV2,
			translationContext.signedResourceGains,
		],
	);

	const populationGroup = displayBuckets.groups[0];
	const populationRoles = populationGroup?.children ?? [];
	const currentPopulation = populationGroup?.snapshot.current ?? 0;
	const maxPopulationEntry = displayBuckets.stats.find(
		(entry) => entry.legacyKey === 'maxPopulation',
	);
	const maxPopulation = maxPopulationEntry?.snapshot.current ?? 0;

	const showGeneralStatCard = React.useCallback(() => {
		handleHoverCard({
			title: `${GENERAL_STAT_INFO.icon} ${GENERAL_STAT_INFO.label}`,
			effects: [],
			requirements: [],
			description: GENERAL_STAT_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});
	}, [handleHoverCard]);

	const showPopulationCard = React.useCallback(() => {
		if (!populationGroup) {
			return;
		}
		const effects = buildPopulationHoverSections(populationGroup);
		handleHoverCard({
			title: formatMetadataLabel(populationGroup.metadata),
			effects,
			requirements: [],
			...(populationGroup.metadata.description
				? { description: populationGroup.metadata.description }
				: {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	}, [handleHoverCard, populationGroup]);

	const showRoleCard = React.useCallback(
		(entry: ResourceV2DisplayEntry) => {
			const effects = buildResourceV2HoverSections(
				entry.metadata,
				entry.snapshot,
			);
			handleHoverCard({
				title: formatMetadataLabel(entry.metadata),
				effects,
				requirements: [],
				...(entry.metadata.description
					? { description: entry.metadata.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard],
	);

	const showStatCard = React.useCallback(
		(entry: ResourceV2DisplayEntry) => {
			const baseSections = buildResourceV2HoverSections(
				entry.metadata,
				entry.snapshot,
			);
			const breakdown = getStatBreakdownSummary(
				entry.id,
				player,
				translationContext,
			);
			const effects = [...baseSections];
			if (breakdown.length > 0) {
				effects.push({ title: 'Breakdown', items: breakdown });
			}
			handleHoverCard({
				title: formatMetadataLabel(entry.metadata),
				effects,
				requirements: [],
				...(entry.metadata.description
					? { description: entry.metadata.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard, player, translationContext],
	);

	const maxPopulationLabel = maxPopulationEntry
		? formatResourceV2Value(maxPopulationEntry.metadata, maxPopulation)
		: `${maxPopulation}`;
	const populationLabel = populationGroup
		? formatResourceV2Value(populationGroup.metadata, currentPopulation)
		: `${currentPopulation}`;

	const statEntries = displayBuckets.stats.filter((entry) => {
		if (entry === maxPopulationEntry) {
			return false;
		}
		if (entry.snapshot.current !== 0) {
			return true;
		}
		if (entry.legacyKey && player.statsHistory?.[entry.legacyKey]) {
			return true;
		}
		return false;
	});

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
			{populationGroup && (
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
					{populationGroup.metadata.icon && (
						<span aria-hidden="true">{populationGroup.metadata.icon}</span>
					)}
					{populationLabel}/{maxPopulationLabel}
					{populationRoles.length > 0 && (
						<>
							{' ('}
							{populationRoles.map((role, index) => (
								<React.Fragment key={role.id}>
									{index > 0 && ','}
									<button
										type="button"
										className={ROLE_BUTTON_CLASSES}
										onMouseEnter={() => showRoleCard(role)}
										onMouseLeave={showPopulationCard}
										onFocus={() => showRoleCard(role)}
										onBlur={showPopulationCard}
										onClick={() => showRoleCard(role)}
										aria-label={`${formatMetadataLabel(
											role.metadata,
										)}: ${formatRoleValue(role)}`}
									>
										{role.metadata.icon && (
											<span aria-hidden="true">{role.metadata.icon}</span>
										)}
										{formatRoleValue(role)}
									</button>
								</React.Fragment>
							))}
							{')'}
						</>
					)}
				</div>
			)}
			{statEntries.map((entry) => (
				<StatButton
					key={entry.id}
					metadata={entry.metadata}
					snapshot={entry.snapshot}
					onShow={() => showStatCard(entry)}
					onHide={clearHoverCard}
				/>
			))}
		</div>
	);
};

export default PopulationInfo;
