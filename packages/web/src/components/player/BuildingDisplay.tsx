import React from 'react';
import {
  ACTION_INFO as actionInfo,
  BUILDING_INFO as buildingInfo,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import type { Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';

interface BuildingDisplayProps {
  player: EngineContext['activePlayer'];
  buildingDescriptions: Map<string, Summary>;
}

const BuildingDisplay: React.FC<BuildingDisplayProps> = ({
  player,
  buildingDescriptions,
}) => {
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
            onMouseEnter={() =>
              handleHoverCard({
                title,
                effects: buildingDescriptions.get(b) ?? [],
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
