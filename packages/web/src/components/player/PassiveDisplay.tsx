import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import {
	MODIFIER_INFO as modifierInfo,
	PHASES,
	PASSIVE_INFO,
	POPULATIONS,
} from '@kingdom-builder/contents';
import { describeEffects, splitSummary } from '../../translation';
import type { EffectDef } from '@kingdom-builder/engine';
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
	const ids = ctx.passives.list(player.id);
	const defs = ctx.passives.values(player.id) as {
		effects?: EffectDef[];
		onUpkeepPhase?: EffectDef[];
	}[];
	const map = new Map<
		string,
		{ effects?: EffectDef[]; onUpkeepPhase?: EffectDef[] }
	>(ids.map((id, i) => [id, defs[i]!]));

	const buildingIds = Array.from(player.buildings);
	const buildingIdSet = new Set(buildingIds);
	const buildingPrefixes = buildingIds.map((id) => `${id}_`);
	const developmentIds = new Set(
		player.lands.flatMap((l) => l.developments.map((d) => `${d}_${l.id}`)),
	);

	const entries = Array.from(map.entries()).filter(([id]) => {
		if (buildingIdSet.has(id) || developmentIds.has(id)) return false;
		if (buildingPrefixes.some((prefix) => id.startsWith(prefix))) return false;
		for (const prefix of POPULATION_PASSIVE_PREFIXES)
			if (id.startsWith(prefix)) return false;
		return true;
	});
	if (entries.length === 0) return null;

	const getIcon = (effects: EffectDef[] | undefined) => {
		const first = effects?.[0];
		return ICON_MAP[first?.type as keyof typeof ICON_MAP] ?? PASSIVE_INFO.icon;
	};

	const animatePassives = useAnimate<HTMLDivElement>();
	return (
		<div
			ref={animatePassives}
			className="panel-card flex w-fit items-center gap-3 px-4 py-3 text-lg"
		>
			{entries.map(([id, def]) => {
				const icon = getIcon(def.effects);
				const items = describeEffects(def.effects || [], ctx);
				const upkeepLabel =
					PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
				const summary = def.onUpkeepPhase
					? [{ title: `Until your next ${upkeepLabel} Phase`, items }]
					: items;
				return (
					<span
						key={id}
						className="hoverable cursor-pointer"
						onMouseEnter={() => {
							const { effects, description } = splitSummary(summary);
							handleHoverCard({
								title: `${icon} ${PASSIVE_INFO.label}`,
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
