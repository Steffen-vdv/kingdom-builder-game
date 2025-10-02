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

export interface PassiveEntry {
	summary: PassiveSummary;
	def: {
		id: string;
		effects?: EffectDef[];
		onUpkeepPhase?: EffectDef[];
	};
}

export const getVisiblePassiveEntries = (
	player: EngineContext['activePlayer'],
	ctx: EngineContext,
): PassiveEntry[] => {
	const playerId: PlayerId = player.id;
	const summaries: PassiveSummary[] = ctx.passives.list(playerId);
	const defs = Array.from(
		ctx.passives.values(playerId) as Iterable<{
			id: string;
			effects?: EffectDef[];
			onUpkeepPhase?: EffectDef[];
		}>,
	);
	const defMap = new Map(defs.map((def) => [def.id, def]));

	const buildingIds = Array.from(player.buildings);
	const buildingIdSet = new Set(buildingIds);
	const buildingPrefixes = buildingIds.map((id) => `${id}_`);
	const developmentIds = new Set(
		player.lands.flatMap((l) => l.developments.map((d) => `${d}_${l.id}`)),
	);

	return summaries
		.map((summary) => ({ summary, def: defMap.get(summary.id) }))
		.filter((entry): entry is PassiveEntry => {
			const { summary, def } = entry;
			if (!def) return false;
			if (buildingIdSet.has(summary.id)) return false;
			if (developmentIds.has(summary.id)) return false;
			if (buildingPrefixes.some((prefix) => summary.id.startsWith(prefix)))
				return false;
			for (const prefix of POPULATION_PASSIVE_PREFIXES)
				if (summary.id.startsWith(prefix)) return false;
			return true;
		});
};

export default function PassiveDisplay({
	player,
	entries: providedEntries,
}: {
	player: EngineContext['activePlayer'];
	entries?: PassiveEntry[];
}) {
	const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
	const entries = providedEntries ?? getVisiblePassiveEntries(player, ctx);
	if (entries.length === 0) return null;

	const getIcon = (
		summary: PassiveSummary,
		effects: EffectDef[] | undefined,
	) => {
		if (summary.icon) return summary.icon;
		const first = effects?.[0];
		return ICON_MAP[first?.type as keyof typeof ICON_MAP] ?? PASSIVE_INFO.icon;
	};

	const animatePassives = useAnimate<HTMLDivElement>();
	return (
		<div
			ref={animatePassives}
			className="flex flex-wrap items-center gap-3 text-lg text-slate-700 dark:text-slate-100"
		>
			{entries.map(({ summary: passive, def }) => {
				const icon = getIcon(passive, def.effects);
				const items = describeEffects(def.effects || [], ctx);
				const upkeepLabel =
					PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
				const sections = def.onUpkeepPhase
					? [{ title: `Until your next ${upkeepLabel} Phase`, items }]
					: items;
				const passiveName = passive.name ?? PASSIVE_INFO.label;
				return (
					<span
						key={passive.id}
						className="hoverable cursor-pointer"
						onMouseEnter={() => {
							const { effects, description } = splitSummary(sections);
							handleHoverCard({
								title: `${icon} ${passiveName || PASSIVE_INFO.label}`,
								effects,
								requirements: [],
								...(description && { description }),
								bgClass:
									'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
							});
						}}
						onMouseLeave={clearHoverCard}
					>
						{icon}
					</span>
				);
			})}
		</div>
	);
}
