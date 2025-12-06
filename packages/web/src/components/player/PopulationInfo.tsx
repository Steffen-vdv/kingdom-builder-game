import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { getStatBreakdownSummary } from '../../utils/stats';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import { GENERAL_STAT_INFO, PLAYER_INFO_CARD_BG } from './infoCards';
import {
	buildResourceV2HoverSections,
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../../translation';
import { formatResourceMagnitude } from './ResourceButton';
import StatButton from './StatButton';
import {
	createForecastMap,
	createResourceSnapshot,
	formatResourceTitle,
	getLegacyMapping,
	getResourceIdForLegacy,
	toDescriptorFromMetadata,
} from './resourceV2Snapshots';
import type { SummaryGroup } from '../../translation/content/types';

const POPULATION_ARCHETYPE_LABEL = 'Archetypes';
const MAX_POPULATION_LEGACY_KEY = 'maxPopulation';

const ROLE_BUTTON_CLASSES = [
	'cursor-help rounded-full border border-white/40 bg-white/40 px-2 py-1',
	'text-xs font-semibold text-slate-700 hoverable',
	'dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100',
].join(' ');

interface PopulationInfoProps {
	player: SessionPlayerStateSnapshot;
}

interface ResourceEntry {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
}

const PopulationInfo: React.FC<PopulationInfoProps> = ({ player }) => {
	const { handleHoverCard, clearHoverCard, translationContext } =
		useGameEngine();
	const resourceCatalog = translationContext.resourcesV2;
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];
	const populationRoleDefinitions = React.useMemo(
		() =>
			resourceCatalog
				? resourceCatalog.resources.ordered.filter(
						(definition) =>
							definition.groupId === 'resource-group:population:roles',
					)
				: [],
		[resourceCatalog],
	);
	const populationRoleIds = React.useMemo(
		() => populationRoleDefinitions.map((definition) => definition.id),
		[populationRoleDefinitions],
	);
	const populationGroupDefinition = React.useMemo(() => {
		if (!resourceCatalog) {
			return undefined;
		}
		for (const definition of populationRoleDefinitions) {
			if (definition.groupId) {
				return resourceCatalog.groups.byId[definition.groupId];
			}
		}
		return undefined;
	}, [populationRoleDefinitions, resourceCatalog]);
	const populationParentId = populationGroupDefinition?.parent?.id;
	const statDefinitions = React.useMemo(
		() =>
			resourceCatalog
				? resourceCatalog.resources.ordered.filter(
						(definition) => definition.groupId === 'resource-group:stats',
					)
				: [],
		[resourceCatalog],
	);
	const forecastMap = React.useMemo(
		() =>
			createForecastMap(playerForecast, populationParentId, populationRoleIds),
		[playerForecast, populationParentId, populationRoleIds],
	);
	const snapshotContext = React.useMemo(
		() =>
			({
				player,
				forecastMap,
				signedGains: translationContext.signedResourceGains,
				populationRoleIds,
				...(populationParentId ? { populationParentId } : {}),
			}) satisfies Parameters<typeof createResourceSnapshot>[1],
		[
			player,
			forecastMap,
			translationContext.signedResourceGains,
			populationRoleIds,
			populationParentId,
		],
	);
	const populationEntries = React.useMemo<ResourceEntry[]>(
		() =>
			populationRoleDefinitions.map((definition) => ({
				metadata: translationContext.resourceMetadataV2.get(definition.id),
				snapshot: createResourceSnapshot(definition.id, snapshotContext),
			})),
		[
			populationRoleDefinitions,
			snapshotContext,
			translationContext.resourceMetadataV2,
		],
	);
	const statEntries = React.useMemo<ResourceEntry[]>(
		() =>
			statDefinitions.map((definition) => ({
				metadata: translationContext.resourceMetadataV2.get(definition.id),
				snapshot: createResourceSnapshot(definition.id, snapshotContext),
			})),
		[statDefinitions, snapshotContext, translationContext.resourceMetadataV2],
	);
	const statEntryMap = React.useMemo(
		() =>
			new Map(statEntries.map((entry) => [entry.snapshot.id, entry] as const)),
		[statEntries],
	);
	const populationTotalEntry = React.useMemo(() => {
		if (!populationParentId) {
			return undefined;
		}
		const metadata =
			translationContext.resourceMetadataV2.get(populationParentId);
		const snapshot = createResourceSnapshot(
			populationParentId,
			snapshotContext,
		);
		return { metadata, snapshot } satisfies ResourceEntry;
	}, [
		populationParentId,
		snapshotContext,
		translationContext.resourceMetadataV2,
	]);
	const populationGroupMetadata = React.useMemo(() => {
		if (!populationGroupDefinition) {
			return undefined;
		}
		return translationContext.resourceGroupMetadataV2.get(
			populationGroupDefinition.id,
		);
	}, [populationGroupDefinition, translationContext.resourceGroupMetadataV2]);
	const populationGroupMetadataSnapshot = React.useMemo(
		() =>
			populationGroupMetadata
				? ({ ...populationGroupMetadata } as ResourceV2MetadataSnapshot)
				: undefined,
		[populationGroupMetadata],
	);
	const populationSummaries = React.useMemo(() => {
		return populationEntries.map((entry) => {
			const descriptor = toDescriptorFromMetadata(entry.metadata);
			const base = [descriptor.icon, descriptor.label]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			if (descriptor.description) {
				return `${base} - ${descriptor.description}`.trim();
			}
			return base;
		});
	}, [populationEntries]);
	const populationCardSections = React.useMemo(() => {
		const sections: (string | SummaryGroup)[] = [];
		if (populationTotalEntry) {
			sections.push(
				...buildResourceV2HoverSections(
					populationTotalEntry.metadata,
					populationTotalEntry.snapshot,
				),
			);
		}
		populationSummaries.forEach((summary) => sections.push(summary));
		return sections;
	}, [populationSummaries, populationTotalEntry]);
	const showPopulationCard = React.useCallback(() => {
		const metadata =
			populationGroupMetadataSnapshot ??
			(populationTotalEntry ? populationTotalEntry.metadata : undefined);
		if (!metadata) {
			return;
		}
		handleHoverCard({
			title: formatResourceTitle(metadata),
			effects: populationCardSections,
			effectsTitle: POPULATION_ARCHETYPE_LABEL,
			requirements: [],
			...(metadata.description
				? { description: metadata.description ?? undefined }
				: {}),
			bgClass: PLAYER_INFO_CARD_BG,
		});
	}, [
		handleHoverCard,
		populationCardSections,
		populationGroupMetadataSnapshot,
		populationTotalEntry,
	]);
	const populationRoleButtons = React.useMemo(
		() =>
			populationEntries
				.filter((entry) => entry.snapshot.current > 0)
				.map((entry, index) => {
					const handleRoleFocus = (event: React.SyntheticEvent) => {
						event.stopPropagation();
						const effects = buildResourceV2HoverSections(
							entry.metadata,
							entry.snapshot,
						);
						handleHoverCard({
							title: formatResourceTitle(entry.metadata),
							effects,
							requirements: [],
							bgClass: PLAYER_INFO_CARD_BG,
						});
					};
					const handleRoleLeave = (event: React.SyntheticEvent) => {
						event.stopPropagation();
						showPopulationCard();
					};
					return (
						<React.Fragment key={entry.snapshot.id}>
							{index > 0 && ','}
							<button
								type="button"
								className={ROLE_BUTTON_CLASSES}
								onMouseEnter={handleRoleFocus}
								onMouseLeave={handleRoleLeave}
								onFocus={handleRoleFocus}
								onBlur={handleRoleLeave}
								onClick={handleRoleFocus}
								aria-label={`${entry.metadata.label}: ${entry.snapshot.current}`}
							>
								{entry.metadata.icon && (
									<span aria-hidden="true">{entry.metadata.icon}</span>
								)}
								{entry.snapshot.current}
							</button>
						</React.Fragment>
					);
				}),
		[handleHoverCard, populationEntries, showPopulationCard],
	);
	const showGeneralStatCard = () =>
		handleHoverCard({
			title: `${GENERAL_STAT_INFO.icon} ${GENERAL_STAT_INFO.label}`,
			effects: [],
			requirements: [],
			description: GENERAL_STAT_INFO.description,
			bgClass: PLAYER_INFO_CARD_BG,
		});
	const showStatCard = React.useCallback(
		(resourceId: string) => {
			const entry = statEntryMap.get(resourceId);
			if (!entry) {
				return;
			}
			const legacyMapping = getLegacyMapping(resourceId);
			const statKey =
				legacyMapping?.bucket === 'stats' ? legacyMapping.key : resourceId;
			const breakdown = getStatBreakdownSummary(
				statKey,
				player,
				translationContext,
			);
			const sections = buildResourceV2HoverSections(
				entry.metadata,
				entry.snapshot,
			);
			const effects = breakdown.length
				? ([...sections, { title: 'Breakdown', items: breakdown }] as (
						| string
						| SummaryGroup
					)[])
				: sections;
			handleHoverCard({
				title: formatResourceTitle(entry.metadata),
				effects,
				requirements: [],
				...(entry.metadata.description
					? { description: entry.metadata.description }
					: {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[handleHoverCard, player, statEntryMap, translationContext],
	);
	const populationTotal = populationTotalEntry?.snapshot.current ?? 0;
	const maxPopulationId = React.useMemo(
		() =>
			getResourceIdForLegacy('stats', MAX_POPULATION_LEGACY_KEY) ??
			MAX_POPULATION_LEGACY_KEY,
		[],
	);
	const maxPopulationEntry = statEntryMap.get(maxPopulationId);
	const maxPopulation = maxPopulationEntry?.snapshot.current ?? 0;
	const populationDisplayMetadata = React.useMemo(() => {
		if (populationTotalEntry?.metadata) {
			return populationTotalEntry.metadata;
		}
		if (populationGroupMetadataSnapshot) {
			return populationGroupMetadataSnapshot;
		}
		return {
			id: populationParentId ?? 'population',
			label: 'Population',
		} as ResourceV2MetadataSnapshot;
	}, [
		populationGroupMetadataSnapshot,
		populationParentId,
		populationTotalEntry,
	]);
	const maxPopulationMetadata = React.useMemo(
		() => maxPopulationEntry?.metadata ?? populationDisplayMetadata,
		[maxPopulationEntry, populationDisplayMetadata],
	);
	const statEntriesForDisplay = statEntries.filter(
		(entry) => entry.snapshot.id !== maxPopulationId,
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
				{populationDisplayMetadata.icon && (
					<span aria-hidden="true">{populationDisplayMetadata.icon}</span>
				)}
				{`${formatResourceMagnitude(
					populationTotal,
					populationDisplayMetadata,
				)}/${formatResourceMagnitude(maxPopulation, maxPopulationMetadata)}`}
				{populationRoleButtons.length > 0 && (
					<>
						{' ('}
						{populationRoleButtons}
						{')'}
					</>
				)}
			</div>
			{statEntriesForDisplay.map((entry) => (
				<StatButton
					key={entry.snapshot.id}
					metadata={entry.metadata}
					snapshot={entry.snapshot}
					onShow={showStatCard}
					onHide={clearHoverCard}
				/>
			))}
		</div>
	);
};

export default PopulationInfo;
