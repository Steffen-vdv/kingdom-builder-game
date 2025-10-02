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
	PassiveSummary,
	PlayerId,
} from '@kingdom-builder/engine';
import { useAnimate } from '../../utils/useAutoAnimate';
import { HOVER_CARD_BG } from './constants';

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
	const defs = ctx.passives.values(playerId) as Array<{
		id: string;
		effects?: EffectDef[];
		onUpkeepPhase?: EffectDef[];
	}>;
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
				def: { effects?: EffectDef[]; onUpkeepPhase?: EffectDef[] } & {
					id: string;
				};
			} => {
				const { summary, def } = entry;
				if (!def) return false;
				if (buildingIdSet.has(summary.id)) return false;
				if (developmentIds.has(summary.id)) return false;
				if (buildingPrefixes.some((prefix) => summary.id.startsWith(prefix)))
					return false;
				for (const prefix of POPULATION_PASSIVE_PREFIXES)
					if (summary.id.startsWith(prefix)) return false;
				return true;
			},
		);
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
		<section className="panel-section">
			<header className="panel-section__heading">
				<span className="text-base leading-none">{PASSIVE_INFO.icon}</span>
				<span className="panel-section__label">{PASSIVE_INFO.label}</span>
			</header>
			<div
				ref={animatePassives}
				className="flex w-full flex-wrap items-center gap-2 text-lg"
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
						<button
							key={passive.id}
							type="button"
							className="panel-chip hoverable"
							onMouseEnter={() => {
								const { effects, description } = splitSummary(sections);
								handleHoverCard({
									title: `${icon} ${passiveName || PASSIVE_INFO.label}`,
									effects,
									requirements: [],
									...(description && { description }),
									bgClass: HOVER_CARD_BG,
								});
							}}
							onMouseLeave={clearHoverCard}
							onClick={() => {
								const { effects, description } = splitSummary(sections);
								handleHoverCard({
									title: `${icon} ${passiveName || PASSIVE_INFO.label}`,
									effects,
									requirements: [],
									...(description && { description }),
									bgClass: HOVER_CARD_BG,
								});
							}}
						>
							<span className="text-base leading-none">{icon}</span>
							<span className="font-semibold">{passiveName}</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}
