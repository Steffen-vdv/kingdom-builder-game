import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import { PHASES, PASSIVE_INFO, PhaseId } from '@kingdom-builder/contents';
import { describeEffects, splitSummary } from '../../translation';
import type {
	EngineContext,
	PassiveSummary,
	PlayerId,
} from '@kingdom-builder/engine';
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

export default function PassiveDisplay({
	player,
}: {
	player: ReturnType<typeof useGameEngine>['ctx']['activePlayer'];
}) {
	const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
	const playerId: PlayerId = player.id;
	const summaries: PassiveSummary[] = ctx.passives.list(playerId);
	const defs = ctx.passives.values(playerId);
	const defMap = new Map(defs.map((def) => [def.id, def]));

	const tierDefinitions = ctx.services.rules.tierDefinitions;
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
		.map((summary) => ({ summary, def: defMap.get(summary.id) }))
		.filter(
			(
				entry,
			): entry is {
				summary: PassiveSummary;
				def: ReturnType<EngineContext['passives']['values']>[number];
			} => entry.def !== undefined,
		);
	if (entries.length === 0) {
		return null;
	}

	const animatePassives = useAnimate<HTMLDivElement>();
	return (
		<div
			ref={animatePassives}
			className="panel-card flex w-fit flex-col gap-3 px-4 py-3 text-left text-base"
		>
			{entries.map(({ summary: passive, def }) => {
				const definition: PassiveDefinitionLike = {};
				if (def.detail !== undefined) {
					definition.detail = def.detail;
				}
				if (def.meta !== undefined) {
					definition.meta = def.meta;
				}
				if (def.effects !== undefined) {
					definition.effects = def.effects;
				}
				const presentation = resolvePassivePresentation(passive, {
					definition,
				});
				const icon = presentation.icon || PASSIVE_INFO.icon || '';
				const label = presentation.label;
				const displayLabel = label || PASSIVE_INFO.label || '';
				const removalText = presentation.removal;
				const summaryText = presentation.summary;
				const tierDefinition = tierByPassiveId.get(passive.id);
				const tierSections = tierDefinition
					? buildTierEntries([tierDefinition], tierDefinition.id, ctx).entries
					: undefined;
				const items = tierSections
					? tierSections
					: describeEffects(def.effects || [], ctx);
				const upkeepLabel =
					PHASES.find((phase) => phase.id === PhaseId.Upkeep)?.label ||
					'Upkeep';
				const sections = def.onUpkeepPhase
					? [{ title: `Until your next ${upkeepLabel} Phase`, items }]
					: items;
				return (
					<div
						key={passive.id}
						className="hoverable cursor-help rounded-xl border border-white/50 bg-white/60 p-3 shadow-sm transition hover:border-blue-400/70 hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/50 dark:hover:border-blue-300/60 dark:hover:bg-slate-900/70"
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
