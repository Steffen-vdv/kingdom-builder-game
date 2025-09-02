import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import { MODIFIER_INFO as modifierInfo } from '@kingdom-builder/contents';
import { describeEffects, splitSummary } from '../../translation';
import { renderSummary } from '../../translation/render';
import type { EffectDef } from '@kingdom-builder/engine';
import { useAnimate } from '../../utils/useAutoAnimate';
import Tooltip from '../common/Tooltip';

export const ICON_MAP: Record<string, string> = {
  cost_mod: modifierInfo.cost.icon,
  result_mod: modifierInfo.result.icon,
};

export default function PassiveDisplay({
  player,
}: {
  player: ReturnType<typeof useGameEngine>['ctx']['activePlayer'];
}) {
  const { ctx } = useGameEngine();
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
    return ICON_MAP[first?.type as keyof typeof ICON_MAP] ?? '❔';
  };

  const animatePassives = useAnimate<HTMLDivElement>();
  return (
    <div
      ref={animatePassives}
      className="panel-card flex items-center gap-1 px-3 py-2 w-fit"
    >
      {entries.map(([id, def]) => {
        const icon = getIcon(def.effects);
        const items = describeEffects(def.effects || [], ctx);
        const summary = def.onUpkeepPhase
          ? [{ title: 'Until your next Upkeep Phase', items }]
          : items;
        const split = splitSummary(summary);
        const content = (
          <div>
            <div className="font-medium">{icon} Passive</div>
            {split.description && (
              <ul className="mt-1 list-disc pl-4">
                {renderSummary(split.description)}
              </ul>
            )}
            {split.effects.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {renderSummary(split.effects)}
              </ul>
            )}
          </div>
        );
        return (
          <Tooltip key={id} content={content}>
            <span className="hoverable cursor-pointer">{icon}</span>
          </Tooltip>
        );
      })}
    </div>
  );
}
