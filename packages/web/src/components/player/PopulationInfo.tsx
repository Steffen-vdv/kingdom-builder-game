import React from 'react';
import { POPULATION_ROLES, STATS } from '@kingdom-builder/contents';
import { formatStatValue } from '../../utils/stats';
import type { EngineContext } from '@kingdom-builder/engine';
import Tooltip from '../common/Tooltip';

interface PopulationInfoProps {
  player: EngineContext['activePlayer'];
}

const PopulationInfo: React.FC<PopulationInfoProps> = ({ player }) => {
  const popEntries = Object.entries(player.population).filter(([, v]) => v > 0);
  const currentPop = popEntries.reduce((sum, [, v]) => sum + v, 0);
  const popDetails = popEntries.map(([role, count]) => ({ role, count }));
  const popTooltip = (
    <div>
      <div className="font-medium">👥 Population</div>
      <ul className="mt-1 list-disc pl-4">
        {Object.values(POPULATION_ROLES).map((r) => (
          <li key={r.label}>
            {r.icon} {r.label} - {r.description}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <div className="h-4 border-l border-black/10 dark:border-white/10" />
      <Tooltip content={popTooltip}>
        <div
          role="button"
          tabIndex={0}
          className="bar-item hoverable cursor-default rounded px-1"
        >
          👥{currentPop}/{player.maxPopulation}
          {popDetails.length > 0 && (
            <>
              {' ('}
              {popDetails.map(({ role, count }, i) => {
                const info =
                  POPULATION_ROLES[role as keyof typeof POPULATION_ROLES];
                return (
                  <React.Fragment key={role}>
                    {i > 0 && ','}
                    <Tooltip
                      content={
                        <span>
                          {info.icon} {info.label} - {info.description}
                        </span>
                      }
                    >
                      <button
                        type="button"
                        className="cursor-default hoverable rounded px-1"
                      >
                        {info.icon}
                        {count}
                      </button>
                    </Tooltip>
                  </React.Fragment>
                );
              })}
              {')'}
            </>
          )}
        </div>
      </Tooltip>
      {Object.entries(player.stats)
        .filter(([k, v]) => {
          const info = STATS[k as keyof typeof STATS];
          return !info.capacity && (v !== 0 || player.statsHistory?.[k]);
        })
        .map(([k, v]) => {
          const info = STATS[k as keyof typeof STATS];
          return (
            <Tooltip
              key={k}
              content={
                <span>
                  {info.icon} {info.label} - {info.description}
                </span>
              }
            >
              <button
                type="button"
                className="bar-item hoverable cursor-default rounded px-1"
              >
                {info.icon}
                {formatStatValue(k, v)}
              </button>
            </Tooltip>
          );
        })}
    </>
  );
};

export default PopulationInfo;
