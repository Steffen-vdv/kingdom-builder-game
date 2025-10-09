import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import {
	PASSIVE_INFO,
	PhaseId,
	type ResourceKey,
} from '@kingdom-builder/contents';
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
	const playerId: SessionPlayerId = player.id;
	const summaries: SessionPassiveSummary[] =
		translationContext.passives.list(playerId);
	const definitions = translationContext.passives.definitions(playerId);
	const definitionMap = new Map(
		definitions.map((definition) => [definition.id, definition]),
	);

	const tierDefinitions = ruleSnapshot.tierDefinitions;
	const happinessKey = ruleSnapshot.tieredResourceKey as ResourceKey;
	const tierByPassiveId = tierDefinitions.reduce<
		Map<string, HappinessTierDefinition>
	>((map, tier) => {
		const passiveId = tier.preview?.id;
		if (passiveId) {
			map.set(passiveId, tier);
		}
		return map;
	}, new Map());
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
				definition: (typeof definitions)[number];
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
				});
				const icon = presentation.icon || PASSIVE_INFO.icon || '';
				const label = presentation.label;
				const displayLabel = label || PASSIVE_INFO.label || '';
				const removalText = presentation.removal;
				const summaryText = presentation.summary;
				const tierDefinition = tierByPassiveId.get(passive.id);
				const tierSections = tierDefinition
					? buildTierEntries(
							[tierDefinition],
							tierDefinition.id,
							happinessKey,
							translationContext,
						).entries
					: undefined;
				const items = tierSections
					? tierSections
					: describeEffects(resolvedEffects, translationContext);
				const upkeepLabel =
					translationContext.phases.find((phase) => phase.id === PhaseId.Upkeep)
						?.label || 'Upkeep';
				const sections = definition.onUpkeepPhase
					? [{ title: `Until your next ${upkeepLabel} Phase`, items }]
					: items;
				return (
					<div
						key={passive.id}
						className={
							'hoverable cursor-help rounded-xl border border-white/50 ' +
							'bg-white/60 p-3 shadow-sm transition hover:border-blue-400/70 ' +
							'hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/50 ' +
							'dark:hover:border-blue-300/60 dark:hover:bg-slate-900/70'
						}
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
								title: icon ? `${icon} ${displayLabel}` : displayLabel,
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
								{displayLabel}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
