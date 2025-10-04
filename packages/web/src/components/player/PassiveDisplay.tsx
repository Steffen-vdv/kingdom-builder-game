import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import {
	MODIFIER_INFO as modifierInfo,
	PHASES,
	PASSIVE_INFO,
	POPULATIONS,
} from '@kingdom-builder/contents';
import { describeEffects, splitSummary } from '../../translation';
import type {
	EffectDef,
	EngineContext,
	PassiveSummary,
	PlayerId,
} from '@kingdom-builder/engine';
import { useAnimate } from '../../utils/useAutoAnimate';

export const ICON_MAP: Record<string, string> = {
	cost_mod: modifierInfo.cost.icon,
	result_mod: modifierInfo.result.icon,
};

const POPULATION_PASSIVE_PREFIXES = new Set(
	POPULATIONS.keys().map((id) => `${id}_`),
);

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

	const buildingIds = Array.from(player.buildings);
	const buildingIdSet = new Set(buildingIds);
	const buildingPrefixes = buildingIds.map((id) => `${id}_`);
	const developmentIds = new Set(
		player.lands.flatMap((l) => l.developments.map((d) => `${d}_${l.id}`)),
	);

	const entries = summaries
		.map((summary) => ({ summary, def: defMap.get(summary.id) }))
		.filter(
			(
				entry,
			): entry is {
				summary: PassiveSummary;
				def: ReturnType<EngineContext['passives']['values']>[number];
			} => {
				const { summary, def } = entry;
				if (!def) {
					return false;
				}
				if (buildingIdSet.has(summary.id)) {
					return false;
				}
				if (developmentIds.has(summary.id)) {
					return false;
				}
				if (buildingPrefixes.some((prefix) => summary.id.startsWith(prefix))) {
					return false;
				}
				for (const prefix of POPULATION_PASSIVE_PREFIXES) {
					if (summary.id.startsWith(prefix)) {
						return false;
					}
				}
				return true;
			},
		);
	if (entries.length === 0) {
		return null;
	}

	const getIcon = (
		summary: PassiveSummary,
		effects: EffectDef[] | undefined,
		meta: PassiveSummary['meta'],
	) => {
		if (meta?.source?.icon) {
			return meta.source.icon;
		}
		if (summary.icon) {
			return summary.icon;
		}
		const first = effects?.[0];
		return ICON_MAP[first?.type as keyof typeof ICON_MAP] ?? PASSIVE_INFO.icon;
	};

	const resolveRemovalText = (meta: PassiveSummary['meta']) => {
		if (!meta?.removal) {
			return undefined;
		}
		if (
			typeof meta.removal.text === 'string' &&
			meta.removal.text.trim().length > 0
		) {
			return meta.removal.text;
		}
		if (
			typeof meta.removal.token === 'string' &&
			meta.removal.token.trim().length > 0
		) {
			return `Active as long as ${meta.removal.token}`;
		}
		return undefined;
	};

	const resolveLabel = (
		summary: PassiveSummary,
		def: Pick<
			ReturnType<EngineContext['passives']['values']>[number],
			'detail' | 'meta'
		>,
	) => {
		const meta = def.meta ?? summary.meta;
		const labelToken = meta?.source?.labelToken;
		if (labelToken && labelToken.trim().length > 0) {
			return labelToken;
		}
		if (def.detail && def.detail.trim().length > 0) {
			return def.detail;
		}
		if (summary.detail && summary.detail.trim().length > 0) {
			return summary.detail;
		}
		if (summary.name && summary.name.trim().length > 0) {
			return summary.name;
		}
		return summary.id;
	};

	const animatePassives = useAnimate<HTMLDivElement>();
	return (
		<div
			ref={animatePassives}
			className="panel-card flex w-fit flex-col gap-3 px-4 py-3 text-left text-base"
		>
			{entries.map(({ summary: passive, def }) => {
				const meta = def.meta ?? passive.meta;
				const icon = getIcon(passive, def.effects, meta);
				const label = resolveLabel(passive, def);
				const removalText = resolveRemovalText(meta);
				const items = describeEffects(def.effects || [], ctx);
				const upkeepLabel =
					PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
				const sections = def.onUpkeepPhase
					? [{ title: `Until your next ${upkeepLabel} Phase`, items }]
					: items;
				const passiveName = passive.name ?? PASSIVE_INFO.label;
				return (
					<div
						key={passive.id}
						className="hoverable cursor-pointer rounded-xl border border-white/50 bg-white/60 p-3 shadow-sm transition hover:border-blue-400/70 hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/50 dark:hover:border-blue-300/60 dark:hover:bg-slate-900/70"
						onMouseEnter={() => {
							const { effects, description } = splitSummary(sections);
							const descriptionEntries = [...(description ?? [])] as ReturnType<
								typeof splitSummary
							>['effects'];
							if (removalText) {
								descriptionEntries.push(removalText);
							}
							handleHoverCard({
								title: `${icon} ${passiveName || PASSIVE_INFO.label}`,
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
						<div className="flex items-start gap-3">
							<span className="text-2xl leading-none">{icon}</span>
							<div className="flex flex-col gap-1 text-sm leading-snug">
								<span className="font-semibold text-slate-700 dark:text-slate-100">
									{label}
								</span>
								{removalText && (
									<span className="text-xs text-slate-600 dark:text-slate-300">
										{removalText}
									</span>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
