import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { renderSummary } from '../../translation/render';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import Tooltip from '../common/Tooltip';

interface BuildingDisplayProps {
  player: EngineContext['activePlayer'];
}

const BuildingDisplay: React.FC<BuildingDisplayProps> = ({ player }) => {
  const { ctx } = useGameEngine();
  if (player.buildings.size === 0) return null;
  const animateBuildings = useAnimate<HTMLDivElement>();
  return (
    <div ref={animateBuildings} className="flex flex-wrap gap-2 mt-2 w-fit">
      {Array.from(player.buildings).map((b) => {
        const name = ctx.buildings.get(b)?.name || b;
        const icon =
          ctx.buildings.get(b)?.icon || ctx.actions.get('build').icon || '';
        const title = `${icon} ${name}`;
        const full = describeContent('building', b, ctx, {
          installed: true,
        });
        const split = splitSummary(full);
        const content = (
          <div>
            <div className="font-medium">{title}</div>
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
          <Tooltip key={b} content={content}>
            <div className="panel-card p-2 text-center hoverable cursor-default">
              <span className="font-medium">
                {icon} {name}
              </span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default BuildingDisplay;
