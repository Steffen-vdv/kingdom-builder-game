import React from 'react';
import {
  ACTION_INFO as actionInfo,
  BUILDING_INFO as buildingInfo,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
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
        const icon = buildingInfo[b]?.icon || actionInfo['build']?.icon || '';
        const title = `${icon} ${name}`;
        return (
          <div
            key={b}
            className="panel-card p-2 text-center hoverable cursor-help"
            onMouseEnter={() => {
              const full = describeContent('building', b, ctx, {
                installed: true,
              });
              const { effects, description } = splitSummary(full);
              handleHoverCard({
                title,
                effects,
                requirements: [],
                ...(description && { description }),
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              });
            }}
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
