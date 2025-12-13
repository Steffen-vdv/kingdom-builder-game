import React from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import {
	useLandMetadata,
	usePassiveAssetMetadata,
} from '../../contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from './registryDisplays';
import { resolveBuildingDisplay } from '../../translation/content/buildingIcons';
import { resolvePassivePresentation } from '../../translation/log/passives';

interface AssetsRowProps {
	player: SessionPlayerStateSnapshot;
}

const HOVER_CARD_BG =
	'bg-gradient-to-br from-white/80 to-white/60 ' +
	'dark:from-slate-900/80 dark:to-slate-900/60';

// Default building icon and label (no asset metadata available)
const BUILDING_ICON = '🏗️';
const BUILDING_LABEL = 'Building';

/**
 * Compact assets row showing lands count, buildings count, and effects count.
 * Designed to sit at the bottom of the PlayerPanel inside the panel-card.
 */
const AssetsRow: React.FC<AssetsRowProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard } =
		useGameEngine();
	const landMeta = useLandMetadata();
	const passiveMeta = usePassiveAssetMetadata();

	const landDescriptor = React.useMemo(
		() => toDescriptorDisplay(landMeta.select()),
		[landMeta],
	);
	const passiveDescriptor = React.useMemo(
		() => toDescriptorDisplay(passiveMeta.select()),
		[passiveMeta],
	);

	const landsCount = player.lands.length;
	const buildingsCount = player.buildings.length;

	// Count passives (effects)
	const passiveSummaries = translationContext.passives.list(player.id);
	const effectsCount = passiveSummaries.length;

	// Build hover card for lands
	const showLandsCard = React.useCallback(() => {
		const landItems = player.lands.map((land) => {
			const full = describeContent('land', land, translationContext);
			const { effects } = splitSummary(full);
			const firstEffect = effects[0];
			return typeof firstEffect === 'string'
				? firstEffect
				: `${landDescriptor.icon ?? '🗺️'} ${landDescriptor.label}`;
		});
		handleHoverCard({
			title: `${landDescriptor.icon ?? '🗺️'} ${landDescriptor.label}s (${landsCount})`,
			effects: landItems.length > 0 ? landItems : ['No lands owned'],
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

	// Build hover card for buildings
	const showBuildingsCard = React.useCallback(() => {
		const buildingItems = player.buildings.map((buildingId) => {
			const { name, icon } = resolveBuildingDisplay(
				buildingId,
				translationContext,
			);
			const displayIcon = icon || BUILDING_ICON;
			return `${displayIcon} ${name}`;
		});
		handleHoverCard({
			title: `${BUILDING_ICON} ${BUILDING_LABEL}s (${buildingsCount})`,
			effects:
				buildingItems.length > 0 ? buildingItems : ['No buildings owned'],
			requirements: [],
			bgClass: HOVER_CARD_BG,
		});
	}, [player.buildings, translationContext, handleHoverCard, buildingsCount]);

	// Build hover card for effects/passives
	const showEffectsCard = React.useCallback(() => {
		const definitions = translationContext.passives.definitions(player.id);
		const defMap = new Map(definitions.map((d) => [d.id, d]));
		const effectItems = passiveSummaries.map((summary) => {
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
				options = { ...baseOptions, definition: passiveDef };
			} else {
				options = baseOptions;
			}
			const presentation = resolvePassivePresentation(summary, options);
			const icon = presentation.icon || passiveDescriptor.icon || '✨';
			return `${icon} ${presentation.label}`;
		});
		handleHoverCard({
			title: `${passiveDescriptor.icon ?? '✨'} Active Effects (${effectsCount})`,
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
						<span aria-hidden="true">{landDescriptor.icon ?? '🗺️'}</span>
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
						<span aria-hidden="true">{BUILDING_ICON}</span>
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
					<span aria-hidden="true">{passiveDescriptor.icon ?? '✨'}</span>
					<span className="font-semibold">{effectsCount} effects</span>
				</button>
			)}
		</div>
	);
};

export default AssetsRow;
