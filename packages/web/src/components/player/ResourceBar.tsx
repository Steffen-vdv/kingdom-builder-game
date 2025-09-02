import React from 'react';
import { RESOURCES } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import Tooltip from '../common/Tooltip';

interface ResourceBarProps {
  player: EngineContext['activePlayer'];
}

const ResourceBar: React.FC<ResourceBarProps> = ({ player }) => {
  return (
    <>
      {Object.entries(player.resources).map(([k, v]) => {
        const info = RESOURCES[k as keyof typeof RESOURCES];
        const content = (
          <span>
            {info.icon} {info.label} - {info.description}
          </span>
        );
        return (
          <Tooltip key={k} content={content}>
            <button
              type="button"
              className="bar-item hoverable cursor-default rounded px-1"
            >
              {info.icon}
              {v}
            </button>
          </Tooltip>
        );
      })}
    </>
  );
};

export default ResourceBar;
