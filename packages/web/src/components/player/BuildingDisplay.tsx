import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';

interface BuildingDisplayProps {
  player: EngineContext['activePlayer'];
}

const BuildingDisplay: React.FC<BuildingDisplayProps> = ({ player }) => {
  const { ctx, handleHoverCard, pinHoverCard, clearHoverCard } =
    useGameEngine();
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
        const { effects, description } = splitSummary(full);
        const data = {
          title,
          effects,
          requirements: [],
          ...(description && { description }),
          bgClass: 'bg-gray-100 dark:bg-gray-700',
        };
        return (
          <div
            key={b}
            tabIndex={0}
            className="panel-card p-2 text-center hoverable cursor-help"
            onMouseEnter={() => handleHoverCard(data)}
            onMouseLeave={() => clearHoverCard()}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                pinHoverCard(data);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                pinHoverCard(data);
              }
            }}
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
