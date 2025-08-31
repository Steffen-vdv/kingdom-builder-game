import React from 'react';
import { RESOURCES } from '@kingdom-builder/contents';
import type { ResourceInfo } from '@kingdom-builder/contents/src/resources';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';
import { useDeltaFlash } from '../../utils/useDeltaFlash';

interface ResourceBarProps {
  player: EngineContext['activePlayer'];
}

const ResourceItem: React.FC<{
  v: number;
  info: ResourceInfo;
  handleHoverCard: ReturnType<typeof useGameEngine>['handleHoverCard'];
  clearHoverCard: ReturnType<typeof useGameEngine>['clearHoverCard'];
}> = ({ v, info, handleHoverCard, clearHoverCard }) => {
  const ref = useDeltaFlash<HTMLSpanElement>(v);
  return (
    <span
      ref={ref}
      className="bar-item hoverable cursor-help rounded px-1"
      onMouseEnter={() =>
        handleHoverCard({
          title: `${info.icon} ${info.label}`,
          effects: [],
          requirements: [],
          description: info.description,
          bgClass: 'bg-gray-100 dark:bg-gray-700',
        })
      }
      onMouseLeave={clearHoverCard}
    >
      {info.icon}
      {v}
    </span>
  );
};

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
  const { handleHoverCard, clearHoverCard } = useGameEngine();
  return (
    <>
      {Object.entries(player.resources).map(([k, v]) => {
        const info = RESOURCES[k as keyof typeof RESOURCES];
        return (
          <ResourceItem
            key={k}
            v={v}
            info={info}
            handleHoverCard={handleHoverCard}
            clearHoverCard={clearHoverCard}
          />
        );
      })}
    </>
  );
};

export default ResourceBar;
