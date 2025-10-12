import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import type {
	EffectDef,
	SessionPassiveSummary,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol';
import { describeEffects, splitSummary } from '../../translation';
import { useAnimate } from '../../utils/useAutoAnimate';
import {
	resolvePassivePresentation,
	type PassiveDefinitionLike,
} from '../../translation/log/passives';
import {
	buildTierEntries,
	type TierDefinition as HappinessTierDefinition,
} from './buildTierEntries';
import {
	createPassiveVisibilityContext,
	filterPassivesForSurface,
} from '../../passives/visibility';
import {
	usePassiveAssetMetadata,
	usePhaseMetadata,
	useResourceMetadata,
} from '../../contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from './registryDisplays';
import type { TranslationPassiveDefinition } from '../../translation/context';

const ON_UPKEEP_PHASE_TRIGGER = 'onUpkeepPhase';

function normalizeEffectList(
	value: unknown,
): EffectDef<Record<string, unknown>>[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter(
		(effect): effect is EffectDef<Record<string, unknown>> =>
			effect !== null && typeof effect === 'object' && 'type' in effect,
	);
}

export default function PassiveDisplay({
	player,
}: {
	player: SessionPlayerStateSnapshot;
}) {
	const { translationContext, handleHoverCard, clearHoverCard, ruleSnapshot } =
		useGameEngine();
	const passiveAssetMetadata = usePassiveAssetMetadata();
	const passiveAsset = React.useMemo(
		() => toDescriptorDisplay(passiveAssetMetadata.select()),
		[passiveAssetMetadata],
	);
	const resourceMetadata = useResourceMetadata();
	const phaseMetadata = usePhaseMetadata();
	const upkeepPhase = React.useMemo(() => {
		for (const phase of phaseMetadata.list) {
			for (const step of phase.steps) {
				if (step.triggers.includes(ON_UPKEEP_PHASE_TRIGGER)) {
					return phase;
				}
			}
		}
		return undefined;
	}, [phaseMetadata]);
	const upkeepLabel =
		upkeepPhase?.label ?? translationContext.assets.upkeep.label ?? 'Upkeep';
	const playerId: SessionPlayerId = player.id;
	const summaries: SessionPassiveSummary[] =
		translationContext.passives.list(playerId);
	const definitions: ReadonlyArray<TranslationPassiveDefinition> =
		translationContext.passives.definitions(playerId);
	const definitionMap = React.useMemo(
		() =>
			new Map(
				definitions.map((definition) => [definition.id, definition] as const),
			),
		[definitions],
	);

	const tierDefinitions = ruleSnapshot.tierDefinitions;
	const happinessKey = ruleSnapshot.tieredResourceKey;
	const tieredResourceDescriptor = React.useMemo(
		() =>
			happinessKey
				? toDescriptorDisplay(resourceMetadata.select(happinessKey))
				: undefined,
		[happinessKey, resourceMetadata],
	);
	const tierByPassiveId = React.useMemo(
		() =>
			tierDefinitions.reduce<Map<string, HappinessTierDefinition>>(
				(map, tier) => {
					const passiveId = tier.preview?.id;
					if (passiveId) {
						map.set(passiveId, tier);
					}
					return map;
				},
				new Map(),
			),
		[tierDefinitions],
	);
	const visibilityContext = createPassiveVisibilityContext(player);
	const visibleSummaries = filterPassivesForSurface(
		summaries,
		visibilityContext,
		'player-panel',
	);

	const entries = visibleSummaries
		.map((summary) => ({
			summary,
			definition: definitionMap.get(summary.id),
		}))
		.filter(
			(
				entry,
			): entry is {
				summary: SessionPassiveSummary;
				definition: TranslationPassiveDefinition;
			} => entry.definition !== undefined,
		);
	if (entries.length === 0) {
		return null;
	}

	const animatePassives = useAnimate<HTMLDivElement>();
	return (
		<div
			ref={animatePassives}
			className={
				'panel-card flex w-fit flex-col gap-3 px-4 py-3 ' +
				'text-left text-base'
			}
		>
			{entries.map(({ summary: passive, definition }) => {
				const passiveDefinition: PassiveDefinitionLike = {};
				if (typeof definition.detail === 'string') {
					passiveDefinition.detail = definition.detail;
				}
				if (definition.meta) {
					passiveDefinition.meta = definition.meta;
				}
				const resolvedEffects = normalizeEffectList(definition.effects);
				if (resolvedEffects.length > 0) {
					passiveDefinition.effects = resolvedEffects;
				}
				const presentation = resolvePassivePresentation(passive, {
					definition: passiveDefinition,
					assets: translationContext.assets,
				});
				const icon = presentation.icon || passiveAsset.icon || '♾️';
				const label = presentation.label || passiveAsset.label;
				const removalText = presentation.removal;
				const summaryText = presentation.summary;
				const tierDefinition = tierByPassiveId.get(passive.id);
				const tierSections = tierDefinition
					? buildTierEntries([tierDefinition], {
							activeId: tierDefinition.id,
							tieredResource: tieredResourceDescriptor,
							passiveAsset,
							translationContext,
						}).entries
					: undefined;
				const items = tierSections
					? tierSections
					: describeEffects(resolvedEffects, translationContext);
				const sections = definition.onUpkeepPhase
					? [
							{
								title: `Until your next ${upkeepLabel} Phase`,
								items,
							},
						]
					: items;
				return (
					<div
						key={passive.id}
						className={[
							'hoverable cursor-help rounded-xl border border-white/50',
							'bg-white/60 p-3 shadow-sm transition hover:border-blue-400/70',
							'hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/50',
							'dark:hover:border-blue-300/60 dark:hover:bg-slate-900/70',
						].join(' ')}
						onMouseEnter={() => {
							const { effects, description } = splitSummary(sections);
							const descriptionEntries = tierDefinition
								? []
								: ([...(description ?? [])] as ReturnType<
										typeof splitSummary
									>['effects']);
							if (!tierDefinition && summaryText) {
								descriptionEntries.unshift(summaryText);
							}
							if (!tierDefinition && removalText) {
								descriptionEntries.push(removalText);
							}
							handleHoverCard({
								title: icon ? `${icon} ${label}` : label,
								effects,
								requirements: [],
								...(descriptionEntries.length
									? { description: descriptionEntries }
									: {}),
								bgClass:
									'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
							});
						}}
						onMouseLeave={clearHoverCard}
					>
						<div className="flex items-center gap-2 text-sm leading-snug">
							{icon ? (
								<span className="text-2xl leading-none">{icon}</span>
							) : null}
							<span className="font-semibold text-slate-700 dark:text-slate-100">
								{label}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
