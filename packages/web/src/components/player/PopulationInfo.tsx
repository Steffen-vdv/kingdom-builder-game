import React from 'react';
import { POPULATION_ROLES, STATS } from '@kingdom-builder/contents';
import { formatStatValue } from '../../utils/stats';
import type { EngineContext } from '@kingdom-builder/engine';
import { useGameEngine } from '../../state/GameContext';

interface PopulationInfoProps {
  player: EngineContext['activePlayer'];
}

const PopulationInfo: React.FC<PopulationInfoProps> = ({ player }) => {
  const { handleHoverCard, clearHoverCard } = useGameEngine();
  const popEntries = Object.entries(player.population).filter(([, v]) => v > 0);
  const currentPop = popEntries.reduce((sum, [, v]) => sum + v, 0);
  const popDetails = popEntries.map(([role, count]) => ({ role, count }));

  const showPopulationCard = () =>
    handleHoverCard({
      title: '👥 Population',
      effects: Object.values(POPULATION_ROLES).map(
        (r) => `${r.icon} ${r.label} - ${r.description}`,
      ),
      effectsTitle: 'Archetypes',
      requirements: [],
      description:
        'Population represents the people of your kingdom. Manage them wisely and assign roles to benefit your realm.',
      bgClass: 'bg-gray-100 dark:bg-gray-700',
    });

  return (
    <>
      <div className="h-4 border-l border-black/10 dark:border-white/10" />
      <div
        role="button"
        tabIndex={0}
        className="bar-item hoverable cursor-help rounded px-1"
        onMouseEnter={showPopulationCard}
        onMouseLeave={clearHoverCard}
        onFocus={showPopulationCard}
        onBlur={clearHoverCard}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showPopulationCard();
          }
        }}
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
                  <button
                    type="button"
                    className="cursor-help hoverable rounded px-1"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      handleHoverCard({
                        title: `${info.icon} ${info.label}`,
                        effects: [],
                        requirements: [],
                        description: info.description,
                        bgClass: 'bg-gray-100 dark:bg-gray-700',
                      });
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      showPopulationCard();
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      handleHoverCard({
                        title: `${info.icon} ${info.label}`,
                        effects: [],
                        requirements: [],
                        description: info.description,
                        bgClass: 'bg-gray-100 dark:bg-gray-700',
                      });
                    }}
                    onBlur={(e) => {
                      e.stopPropagation();
                      showPopulationCard();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHoverCard({
                        title: `${info.icon} ${info.label}`,
                        effects: [],
                        requirements: [],
                        description: info.description,
                        bgClass: 'bg-gray-100 dark:bg-gray-700',
                      });
                    }}
                  >
                    {info.icon}
                    {count}
                  </button>
                </React.Fragment>
              );
            })}
            {')'}
          </>
        )}
      </div>
      {Object.entries(player.stats)
        .filter(([k, v]) => {
          const info = STATS[k as keyof typeof STATS];
          return !info.capacity && (v !== 0 || player.statsHistory?.[k]);
        })
        .map(([k, v]) => {
          const info = STATS[k as keyof typeof STATS];
          return (
            <button
              key={k}
              type="button"
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
              onFocus={() =>
                handleHoverCard({
                  title: `${info.icon} ${info.label}`,
                  effects: [],
                  requirements: [],
                  description: info.description,
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                })
              }
              onBlur={clearHoverCard}
              onClick={() =>
                handleHoverCard({
                  title: `${info.icon} ${info.label}`,
                  effects: [],
                  requirements: [],
                  description: info.description,
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                })
              }
            >
              {info.icon}
              {formatStatValue(k, v)}
            </button>
          );
        })}
    </>
  );
};

export default PopulationInfo;
