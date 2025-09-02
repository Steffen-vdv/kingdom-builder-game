import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import ResourceBar from './ResourceBar';
import PopulationInfo from './PopulationInfo';
import LandDisplay from './LandDisplay';
import BuildingDisplay from './BuildingDisplay';
import PassiveDisplay from './PassiveDisplay';
import { useAnimate } from '../../utils/useAutoAnimate';

interface PlayerPanelProps {
  player: EngineContext['activePlayer'];
  className?: string;
  isActive?: boolean;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  className = '',
  isActive = false,
}) => {
  const animateBar = useAnimate<HTMLDivElement>();
  const animateSections = useAnimate<HTMLDivElement>();
  return (
    <div className={`player-panel h-full flex flex-col space-y-1 ${className}`}>
      <h3 className="font-semibold">
        {isActive && (
          <span role="img" aria-label="active player" className="mr-1">
            👑
          </span>
        )}
        {player.name}
      </h3>
      <div
        ref={animateBar}
        className="panel-card flex flex-wrap items-center gap-2 px-3 py-2 w-fit"
      >
        <ResourceBar player={player} />
        <PopulationInfo player={player} />
      </div>
      <div ref={animateSections} className="flex flex-col space-y-1">
        <LandDisplay player={player} />
        <BuildingDisplay player={player} />
        <PassiveDisplay player={player} />
      </div>
    </div>
  );
};

export default PlayerPanel;
