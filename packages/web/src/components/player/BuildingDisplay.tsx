import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent } from '../../translation';
import { useGameEngine } from '../../state/GameContext';

interface BuildingDisplayProps {
  player: EngineContext['activePlayer'];
}

const BuildingDisplay: React.FC<BuildingDisplayProps> = ({ player }) => {
  const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
  if (player.buildings.size === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2 w-fit">
      {Array.from(player.buildings).map((b) => {
        const name = ctx.buildings.get(b)?.name || b;
        const icon =
          ctx.buildings.get(b)?.icon || ctx.actions.get('build').icon || '';
        const title = `${icon} ${name}`;
        return (
          <div
            key={b}
            className="panel-card p-2 text-center hoverable cursor-help"
            onMouseEnter={() =>
              handleHoverCard({
                title,
                effects: describeContent('building', b, ctx, {
                  installed: true,
                }),
                requirements: [],
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              })
            }
            onMouseLeave={clearHoverCard}
          >
            <span className="font-medium">
              {icon} {name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default BuildingDisplay;
