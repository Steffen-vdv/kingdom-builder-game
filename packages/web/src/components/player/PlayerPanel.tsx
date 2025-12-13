import React, { useMemo, type FC } from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol';
import LandDisplay from './LandDisplay';
import BuildingDisplay from './BuildingDisplay';
import PassiveDisplay from './PassiveDisplay';
import ResourceButton from './ResourceButton';
import ResourceGroupDisplay from './ResourceGroupDisplay';
import ResourceWithBoundButton from './ResourceWithBoundButton';
import TierThermometer from './TierThermometer';
import { useAnimate } from '../../utils/useAutoAnimate';
import { useGameEngine } from '../../state/GameContext';
import { useNextTurnForecast } from '../../state/useNextTurnForecast';
import {
	createForecastMap,
	createResourceSnapshot,
	formatResourceTitle,
} from './resourceSnapshots';
import { PLAYER_INFO_CARD_BG } from './infoCards';
import { buildTierEntries } from './buildTierEntries';
import {
	usePassiveAssetMetadata,
	useResourceMetadata,
} from '../../contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from './registryDisplays';
import {
	buildBoundReferenceMap,
	type BoundRefEntry,
} from './boundReferenceHelpers';
import { getResourceBreakdownSummary } from '../../utils/resourceSources';
import {
	groupResourcesBySection,
	getGroupsForSection,
} from './playerPanelHelpers';
import { useHeightTracking } from './useHeightTracking';
import { useActiveTier } from './useActiveTier';

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
	const { handleHoverCard, clearHoverCard, translationContext, ruleSnapshot } =
		useGameEngine();
	const panelRef = useHeightTracking(onHeightChange);
	const animateBar = useAnimate<HTMLDivElement>();
	const animateSections = useAnimate<HTMLDivElement>();

	const resourceCatalog = translationContext.resources;
	const resourceMetadata = useResourceMetadata();
	const forecast = useNextTurnForecast();
	const playerForecast = forecast[player.id];

	const forecastMap = useMemo(
		() => createForecastMap(playerForecast),
		[playerForecast],
	);

	const snapshotContext = useMemo(
		() => ({
			player,
			forecastMap,
			signedGains: translationContext.signedResourceGains,
		}),
		[player, forecastMap, translationContext.signedResourceGains],
	);

	const boundReferenceMap = useMemo(
		() =>
			resourceCatalog
				? buildBoundReferenceMap(resourceCatalog.resources.ordered)
				: new Map<string, BoundRefEntry>(),
		[resourceCatalog],
	);

	// Tier display configuration for tiered resources (e.g., happiness)
	const tierDefinitions = ruleSnapshot.tierDefinitions;
	const tieredResourceKey = ruleSnapshot.tieredResourceKey;

	const tieredResourceDescriptor = useMemo(
		() =>
			tieredResourceKey
				? toDescriptorDisplay(resourceMetadata.select(tieredResourceKey))
				: undefined,
		[tieredResourceKey, resourceMetadata],
	);

	const passiveAssetMetadata = usePassiveAssetMetadata();
	const passiveAssetDescriptor = useMemo(
		() => toDescriptorDisplay(passiveAssetMetadata.select()),
		[passiveAssetMetadata],
	);

	// Get active tier from passives or resource value
	const { activeTierId } = useActiveTier(
		player,
		tierDefinitions,
		tieredResourceKey,
	);

	// Group resources by section
	const resourcesBySection = useMemo(() => {
		if (!resourceCatalog) {
			return { economy: [], combat: [] };
		}
		return groupResourcesBySection(resourceCatalog.resources.ordered);
	}, [resourceCatalog]);

	// Get group IDs for each section
	const economyGroups = useMemo(
		() =>
			resourceCatalog
				? getGroupsForSection(resourceCatalog.resources.ordered, 'economy')
				: [],
		[resourceCatalog],
	);

	const showResourceCard = React.useCallback(
		(resourceId: string) => {
			if (!resourceCatalog) {
				return;
			}
			const definition = resourceCatalog.resources.byId[resourceId];
			if (!definition) {
				return;
			}
			const metadata = translationContext.resourceMetadata.get(resourceId);

			let effects: ReturnType<typeof buildTierEntries>['entries'] = [];
			let thermometer:
				| {
						currentValue: number;
						tiers: ReturnType<typeof buildTierEntries>['summaries'];
						resourceIcon?: string;
				  }
				| undefined;

			if (resourceId === tieredResourceKey && tierDefinitions.length > 0) {
				const sortedTiers = [...tierDefinitions].sort(
					(a, b) => (b.range.min ?? 0) - (a.range.min ?? 0),
				);
				const tierResult = buildTierEntries(sortedTiers, {
					...(activeTierId ? { activeId: activeTierId } : {}),
					tieredResource: tieredResourceDescriptor,
					passiveAsset: passiveAssetDescriptor,
					translationContext,
				});
				effects = tierResult.entries;

				const currentValue = player.values?.[resourceId] ?? 0;
				const icon = tieredResourceDescriptor?.icon;
				thermometer = {
					currentValue,
					tiers: tierResult.summaries,
					...(icon !== undefined && { resourceIcon: icon }),
				};
			}

			const breakdown = definition.trackValueBreakdown
				? getResourceBreakdownSummary(resourceId, player, translationContext)
				: undefined;

			handleHoverCard({
				title: formatResourceTitle(metadata),
				effects,
				requirements: [],
				...(metadata.description ? { description: metadata.description } : {}),
				...(breakdown && breakdown.length > 0 ? { breakdown } : {}),
				...(thermometer ? { thermometer } : {}),
				bgClass: PLAYER_INFO_CARD_BG,
			});
		},
		[
			handleHoverCard,
			resourceCatalog,
			translationContext,
			tieredResourceKey,
			tierDefinitions,
			activeTierId,
			tieredResourceDescriptor,
			passiveAssetDescriptor,
			player,
		],
	);

	const renderResource = React.useCallback(
		(definition: SessionResourceDefinition): React.ReactNode => {
			const resourceId = definition.id;

			// Skip resources with boundOf - they're shown inline with their parent
			const boundInfo = boundReferenceMap.get(resourceId);

			const metadata = translationContext.resourceMetadata.get(resourceId);
			const snapshot = createResourceSnapshot(resourceId, snapshotContext);

			// Render tiered resources (like Happiness) with thermometer inline
			if (definition.tierTrack) {
				const currentValue = player.values?.[resourceId] ?? 0;
				const sortedTiers = [...tierDefinitions].sort(
					(a, b) => (b.range.min ?? 0) - (a.range.min ?? 0),
				);
				const tierResult = buildTierEntries(sortedTiers, {
					...(activeTierId ? { activeId: activeTierId } : {}),
					tieredResource: tieredResourceDescriptor,
					passiveAsset: passiveAssetDescriptor,
					translationContext,
				});

				return (
					<div
						key={resourceId}
						className="resource-tiered col-span-full cursor-pointer"
						onMouseEnter={() => showResourceCard(resourceId)}
						onMouseLeave={clearHoverCard}
						onFocus={() => showResourceCard(resourceId)}
						onBlur={clearHoverCard}
						role="button"
						tabIndex={0}
					>
						<TierThermometer
							currentValue={currentValue}
							tiers={tierResult.summaries}
							{...(metadata.icon ? { resourceIcon: metadata.icon } : {})}
						/>
					</div>
				);
			}

			// If this resource has a bound reference, render with bound
			if (boundInfo) {
				const boundMetadata = translationContext.resourceMetadata.get(
					boundInfo.boundRef.resourceId,
				);
				const boundSnapshot = createResourceSnapshot(
					boundInfo.boundRef.resourceId,
					snapshotContext,
				);

				return (
					<ResourceWithBoundButton
						key={resourceId}
						metadata={metadata}
						snapshot={snapshot}
						boundMetadata={boundMetadata}
						boundSnapshot={boundSnapshot}
						boundType={boundInfo.boundType}
						onShow={showResourceCard}
						onHide={clearHoverCard}
					/>
				);
			}

			// Secondary resources get smaller styling
			const isSecondary = definition.secondary;

			return (
				<ResourceButton
					key={resourceId}
					metadata={metadata}
					snapshot={snapshot}
					onShow={showResourceCard}
					onHide={clearHoverCard}
					compact={isSecondary}
				/>
			);
		},
		[
			boundReferenceMap,
			snapshotContext,
			translationContext,
			player.values,
			tierDefinitions,
			activeTierId,
			tieredResourceDescriptor,
			passiveAssetDescriptor,
			showResourceCard,
			clearHoverCard,
		],
	);

	const panelClassName = [
		'player-panel flex h-auto min-h-[320px] flex-col gap-2',
		'self-start text-slate-800 dark:text-slate-100',
		className,
	]
		.filter(Boolean)
		.join(' ');

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

			{/* Dual-column resource layout */}
			<div ref={animateBar} className="panel-card flex w-full gap-3 px-4 py-3">
				{/* Economy Column */}
				<div className="flex flex-1 flex-col gap-2">
					<div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
						Economy
					</div>
					<div className="info-bar flex flex-wrap gap-1">
						{resourcesBySection.economy.map((def) => renderResource(def))}
						{economyGroups.map((groupId) => (
							<ResourceGroupDisplay
								key={groupId}
								groupId={groupId}
								player={player}
								isPrimaryCategory={true}
							/>
						))}
					</div>
				</div>

				{/* Combat Column */}
				<div className="flex flex-1 flex-col gap-2">
					<div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
						Combat
					</div>
					<div className="info-bar flex flex-wrap gap-1">
						{resourcesBySection.combat.map((def) => renderResource(def))}
					</div>
				</div>
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
