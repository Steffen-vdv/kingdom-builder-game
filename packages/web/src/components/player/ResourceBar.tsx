import React from 'react';
import { RESOURCES } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';

interface ResourceBarProps {
  player: EngineContext['activePlayer'];
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
  const { handleHoverCard, pinHoverCard, clearHoverCard } = useGameEngine();
  return (
    <>
      {Object.entries(player.resources).map(([k, v]) => {
        const info = RESOURCES[k as keyof typeof RESOURCES];
        return (
          <span
            key={k}
            className="bar-item hoverable cursor-help rounded px-1"
            tabIndex={0}
            onMouseEnter={() =>
              handleHoverCard({
                title: `${info.icon} ${info.label}`,
                effects: [],
                requirements: [],
                description: info.description,
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              })
            }
            onMouseLeave={() => clearHoverCard()}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                pinHoverCard({
                  title: `${info.icon} ${info.label}`,
                  effects: [],
                  requirements: [],
                  description: info.description,
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                pinHoverCard({
                  title: `${info.icon} ${info.label}`,
                  effects: [],
                  requirements: [],
                  description: info.description,
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                });
              }
            }}
          >
            {info.icon}
            {v}
          </span>
        );
      })}
    </>
  );
};

export default ResourceBar;
