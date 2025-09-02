import React from 'react';
import { RESOURCES } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';

interface ResourceBarProps {
  player: EngineContext['activePlayer'];
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
  const { handleHoverCard, clearHoverCard } = useGameEngine();
  return (
    <>
      {(Object.keys(RESOURCES) as (keyof typeof RESOURCES)[]).map((k) => {
        const info = RESOURCES[k];
        const v = player.resources[k] ?? 0;
        const showResourceCard = () =>
          handleHoverCard({
            title: `${info.icon} ${info.label}`,
            effects: [],
            requirements: [],
            description: info.description,
            bgClass: 'bg-gray-100 dark:bg-gray-700',
          });
        return (
          <button
            key={k}
            type="button"
            className="bar-item hoverable cursor-help rounded px-1"
            onMouseEnter={showResourceCard}
            onMouseLeave={clearHoverCard}
            onFocus={showResourceCard}
            onBlur={clearHoverCard}
            onClick={showResourceCard}
            aria-label={`${info.label}: ${v}`}
          >
            {info.icon}
            {v}
          </button>
        );
      })}
    </>
  );
};

export default ResourceBar;
