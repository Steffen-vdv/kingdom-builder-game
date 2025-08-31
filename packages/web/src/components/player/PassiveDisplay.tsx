import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import { MODIFIER_INFO as modifierInfo } from '@kingdom-builder/contents';
import { describeEffects } from '../../translation';
import type { EffectDef } from '@kingdom-builder/engine';

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

  const buildingIds = new Set(player.buildings);
  const developmentIds = new Set(
    player.lands.flatMap((l) => l.developments.map((d) => `${d}_${l.id}`)),
  );

  const entries = Array.from(map.entries()).filter(
    ([id]) => !buildingIds.has(id) && !developmentIds.has(id),
  );
  if (entries.length === 0) return null;

  const getIcon = (effects: EffectDef[] | undefined) => {
    const first = effects?.[0];
    if (first?.type === 'cost_mod') return modifierInfo.cost.icon;
    if (first?.type === 'result_mod') return modifierInfo.result.icon;
    return '❔';
  };

  return (
    <div className="panel-card flex items-center gap-1 px-3 py-2 w-fit">
      {entries.map(([id, def]) => {
        const icon = getIcon(def.effects);
        const items = describeEffects(def.effects || [], ctx);
        const summary = def.onUpkeepPhase
          ? [{ title: 'Until your next Upkeep Phase', items }]
          : items;
        return (
          <span
            key={id}
            className="hoverable cursor-pointer"
            onMouseEnter={() =>
              handleHoverCard({
                title: `${icon} Passive`,
                effects: summary,
                requirements: [],
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              })
            }
            onMouseLeave={clearHoverCard}
          >
            {icon}
          </span>
        );
      })}
    </div>
  );
}
