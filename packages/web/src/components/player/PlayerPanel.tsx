import React from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import type { Summary } from '../../translation';
import ResourceBar from './ResourceBar';
import PopulationInfo from './PopulationInfo';
import LandDisplay from './LandDisplay';
import BuildingDisplay from './BuildingDisplay';

interface PlayerPanelProps {
  player: EngineContext['activePlayer'];
  className?: string;
  buildingDescriptions: Map<string, Summary>;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  className = '',
  buildingDescriptions,
}) => {
  return (
    <div className={`player-panel h-full flex flex-col space-y-1 ${className}`}>
      <h3 className="font-semibold">{player.name}</h3>
      <div className="panel-card flex flex-wrap items-center gap-2 px-3 py-2 w-fit">
        <ResourceBar player={player} />
        <PopulationInfo player={player} />
      </div>
      <LandDisplay player={player} />
      <BuildingDisplay
        player={player}
        buildingDescriptions={buildingDescriptions}
      />
    </div>
  );
};

export default PlayerPanel;
