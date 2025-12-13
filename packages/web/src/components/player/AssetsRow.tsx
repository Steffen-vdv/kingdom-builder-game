import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import {
	describeContent,
	splitSummary,
	describeEffects,
} from '../../translation';
import type { Summary, SummaryGroup } from '../../translation/content/types';
import { useGameEngine } from '../../state/GameContext';
import {
	useLandMetadata,
	usePassiveAssetMetadata,
	useBuildingMetadata,
} from '../../contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from './registryDisplays';
import { resolvePassivePresentation } from '../../translation/log/passives';

/**
 * Flatten a Summary into an array of display strings.
 * Handles both string entries and SummaryGroup entries.
 */
function flattenSummary(summary: Summary): string[] {
	const result: string[] = [];
	for (const entry of summary) {
		if (typeof entry === 'string') {
			result.push(entry);
		} else {
			// SummaryGroup - add title and recurse into items
			result.push(entry.title);
			result.push(...flattenSummary(entry.items));
		}
	}
	return result;
}

interface AssetsRowProps {
	player: SessionPlayerStateSnapshot;
}

const HOVER_CARD_BG =
	'bg-gradient-to-br from-white/80 to-white/60 ' +
	'dark:from-slate-900/80 dark:to-slate-900/60';

/**
 * Compact assets row showing lands count, buildings count, and effects count.
 * Designed to sit at the bottom of the PlayerPanel inside the panel-card.
 */
const AssetsRow: React.FC<AssetsRowProps> = ({ player }) => {
	const { translationContext, ruleSnapshot, handleHoverCard, clearHoverCard } =
		useGameEngine();
	const landMeta = useLandMetadata();
	const passiveMeta = usePassiveAssetMetadata();
	const buildingMeta = useBuildingMetadata();

	const landDescriptor = React.useMemo(
		() => toDescriptorDisplay(landMeta.select()),
		[landMeta],
	);
	const passiveDescriptor = React.useMemo(
		() => toDescriptorDisplay(passiveMeta.select()),
		[passiveMeta],
	);
	// Buildings asset descriptor for the category title
	const buildingCategoryAsset = translationContext.assets.building;
	if (!buildingCategoryAsset) {
		throw new Error('Building asset descriptor required for building display');
	}

	const landsCount = player.lands.length;
	const buildingsCount = player.buildings.length;

	// Count passives (effects), excluding building and tier passives
	// since they have dedicated sections
	const buildingIds = React.useMemo(
		() => new Set(player.buildings),
		[player.buildings],
	);
	// Get tier passive IDs from rule definitions (content-driven)
	const tierPassiveIds = React.useMemo(() => {
		const ids = new Set<string>();
		for (const tier of ruleSnapshot.tierDefinitions) {
			if (tier.preview?.id) {
				ids.add(tier.preview.id);
			}
		}
		return ids;
	}, [ruleSnapshot.tierDefinitions]);
	const allPassiveSummaries = translationContext.passives.list(player.id);
	const passiveSummaries = React.useMemo(
		() =>
			allPassiveSummaries.filter((passive) => {
				// Exclude building passives (ID matches a building)
				if (buildingIds.has(passive.id)) {
					return false;
				}
				// Exclude tier passives (ID from tier definitions)
				if (tierPassiveIds.has(passive.id)) {
					return false;
				}
				return true;
			}),
		[allPassiveSummaries, buildingIds, tierPassiveIds],
	);
	const effectsCount = passiveSummaries.length;

	// Build hover card for lands - show each land with its developments
	const showLandsCard = React.useCallback(() => {
		const landItems: (string | SummaryGroup)[] = [];
		const landIcon = landDescriptor.icon;
		for (const land of player.lands) {
			// Get the land's effects (developments)
			const full = describeContent('land', land, translationContext);
			const { effects } = splitSummary(full);
			// Build hierarchical group: land with its effects as children
			if (effects.length > 0) {
				landItems.push({
					title: `${landIcon} ${land.id}`,
					items: effects,
				});
			} else {
				landItems.push(`${landIcon} ${land.id}`);
			}
		}
		handleHoverCard({
			title: `${landDescriptor.icon} ${landDescriptor.label}s (${landsCount})`,
			effects: landItems.length > 0 ? landItems : ['No lands owned'],
			effectsTitle: ' ', // Hide the "Effects" label
			requirements: [],
			bgClass: HOVER_CARD_BG,
		});
	}, [
		player.lands,
		translationContext,
		handleHoverCard,
		landDescriptor,
		landsCount,
	]);

	// Build hover card for buildings - show each building with its effects
	const showBuildingsCard = React.useCallback(() => {
		const buildingItems: (string | SummaryGroup)[] = [];
		for (const buildingId of player.buildings) {
			// Get building metadata for icon/label - required by contract
			const buildingMetadata = buildingMeta.select(buildingId);
			// Get the building's effects
			const full = describeContent('building', buildingId, translationContext);
			const { effects } = splitSummary(full);
			// Build hierarchical group: building name with its effects as children
			if (effects.length > 0) {
				buildingItems.push({
					title: `${buildingMetadata.icon} ${buildingMetadata.label}`,
					items: effects,
				});
			} else {
				buildingItems.push(
					`${buildingMetadata.icon} ${buildingMetadata.label}`,
				);
			}
		}
		handleHoverCard({
			title: `${buildingCategoryAsset.icon} ${buildingCategoryAsset.plural} (${buildingsCount})`,
			effects:
				buildingItems.length > 0 ? buildingItems : ['No buildings owned'],
			requirements: [],
			bgClass: HOVER_CARD_BG,
		});
	}, [
		player.buildings,
		translationContext,
		handleHoverCard,
		buildingsCount,
		buildingMeta,
		buildingCategoryAsset,
	]);

	// Build hover card for effects/passives
	const showEffectsCard = React.useCallback(() => {
		const definitions = translationContext.passives.definitions(player.id);
		const defMap = new Map(definitions.map((d) => [d.id, d]));
		const effectItems: (string | SummaryGroup)[] = [];
		for (const summary of passiveSummaries) {
			const def = defMap.get(summary.id);
			// Build options conditionally to satisfy exactOptionalPropertyTypes
			type PresentationOptions = Parameters<
				typeof resolvePassivePresentation
			>[1];
			type PassiveDef = NonNullable<PresentationOptions['definition']>;
			const baseOptions = { assets: translationContext.assets };
			let options: PresentationOptions;
			if (def) {
				const passiveDef: PassiveDef = {};
				if (def.meta !== undefined) {
					passiveDef.meta = def.meta;
				}
				if (def.detail !== undefined) {
					passiveDef.detail = def.detail;
				}
				// Include effects for icon derivation
				if (def.effects !== undefined) {
					passiveDef.effects = def.effects;
				}
				options = { ...baseOptions, definition: passiveDef };
			} else {
				options = baseOptions;
			}
			const presentation = resolvePassivePresentation(summary, options);
			// Get effects from the passive definition
			const passiveEffects = def?.effects;
			if (passiveEffects && passiveEffects.length > 0) {
				const nestedEffects = describeEffects(
					passiveEffects,
					translationContext,
				);
				const nestedStrings = flattenSummary(nestedEffects);
				// Group under the passive name with its icon
				effectItems.push({
					title: `${presentation.icon} ${presentation.label}`,
					items: nestedStrings,
				});
			} else {
				// No nested effects, just show the passive name
				const label = presentation.summary
					? `${presentation.label}: ${presentation.summary}`
					: presentation.label;
				effectItems.push(`${presentation.icon} ${label}`);
			}
		}
		handleHoverCard({
			title: `${passiveDescriptor.icon} Active Effects (${effectsCount})`,
			effects: effectItems.length > 0 ? effectItems : ['No active effects'],
			requirements: [],
			bgClass: HOVER_CARD_BG,
		});
	}, [
		player.id,
		translationContext,
		passiveSummaries,
		handleHoverCard,
		passiveDescriptor,
		effectsCount,
	]);

	// Don't render if nothing to show
	if (landsCount === 0 && buildingsCount === 0 && effectsCount === 0) {
		return null;
	}

	return (
		<div className="assets-row assets-section">
			{/* Left side: lands and buildings */}
			<div className="flex gap-1.5">
				{landsCount > 0 && (
					<button
						type="button"
						className="asset-badge cursor-help"
						onMouseEnter={showLandsCard}
						onMouseLeave={clearHoverCard}
						aria-label={`${landsCount} lands`}
					>
						<span aria-hidden="true">{landDescriptor.icon}</span>
						<span className="font-semibold">{landsCount}</span>
					</button>
				)}
				{buildingsCount > 0 && (
					<button
						type="button"
						className="asset-badge cursor-help"
						onMouseEnter={showBuildingsCard}
						onMouseLeave={clearHoverCard}
						aria-label={`${buildingsCount} buildings`}
					>
						<span aria-hidden="true">{buildingCategoryAsset.icon}</span>
						<span className="font-semibold">{buildingsCount}</span>
					</button>
				)}
			</div>

			{/* Right side: effects */}
			{effectsCount > 0 && (
				<button
					type="button"
					className="asset-badge asset-badge--effects cursor-help"
					onMouseEnter={showEffectsCard}
					onMouseLeave={clearHoverCard}
					aria-label={`${effectsCount} active effects`}
				>
					<span aria-hidden="true">{passiveDescriptor.icon}</span>
					<span className="font-semibold">{effectsCount} effects</span>
				</button>
			)}
		</div>
	);
};

export default AssetsRow;
