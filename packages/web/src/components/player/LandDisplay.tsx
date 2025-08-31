import React from 'react';
import {
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent } from '../../translation';
import { useGameEngine } from '../../state/GameContext';

interface LandDisplayProps {
  player: EngineContext['activePlayer'];
}

const LandDisplay: React.FC<LandDisplayProps> = ({ player }) => {
  const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
  if (player.lands.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2 w-fit">
      {player.lands.map((land, idx) => {
        const showLandCard = () =>
          handleHoverCard({
            title: `${landIcon} Land`,
            effects: describeContent('land', land, ctx),
            requirements: [],
            effectsTitle: 'Developments',
            bgClass: 'bg-gray-100 dark:bg-gray-700',
          });
        return (
          <div
            key={idx}
            className="relative panel-card p-2 text-center hoverable cursor-help"
            onMouseEnter={showLandCard}
            onMouseLeave={clearHoverCard}
          >
            <span className="font-medium">{landIcon} Land</span>
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {Array.from({ length: land.slotsMax }).map((_, i) => {
                const devId = land.developments[i];
                if (devId) {
                  const name = ctx.developments.get(devId)?.name || devId;
                  const title = `${ctx.developments.get(devId)?.icon || ''} ${name}`;
                  const handleLeave = () => showLandCard();
                  return (
                    <span
                      key={i}
                      className="panel-card p-1 text-xs hoverable cursor-help"
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        handleHoverCard({
                          title,
                          effects: describeContent('development', devId, ctx, {
                            installed: true,
                          }),
                          requirements: [],
                          bgClass: 'bg-gray-100 dark:bg-gray-700',
                        });
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        handleLeave();
                      }}
                    >
                      {ctx.developments.get(devId)?.icon} {name}
                    </span>
                  );
                }
                const handleLeave = () => showLandCard();
                return (
                  <span
                    key={i}
                    className="panel-card p-1 text-xs hoverable cursor-help italic"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      handleHoverCard({
                        title: `${slotIcon} Development Slot (empty)`,
                        effects: [],
                        description: `Use ${ctx.actions.get('develop').icon || ''} ${
                          ctx.actions.get('develop').name
                        } to build here`,
                        requirements: [],
                        bgClass: 'bg-gray-100 dark:bg-gray-700',
                      });
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      handleLeave();
                    }}
                  >
                    {slotIcon} -empty-
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LandDisplay;
