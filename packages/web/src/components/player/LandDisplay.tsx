import React, { useMemo } from 'react';
import {
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';

interface LandDisplayProps {
  player: EngineContext['activePlayer'];
}

const LandTile: React.FC<{
  land: EngineContext['activePlayer']['lands'][number];
  ctx: ReturnType<typeof useGameEngine>['ctx'];
  handleHoverCard: ReturnType<typeof useGameEngine>['handleHoverCard'];
  pinHoverCard: ReturnType<typeof useGameEngine>['pinHoverCard'];
  clearHoverCard: ReturnType<typeof useGameEngine>['clearHoverCard'];
  developAction?: { icon?: string; name: string } | undefined;
}> = ({
  land,
  ctx,
  handleHoverCard,
  pinHoverCard,
  clearHoverCard,
  developAction,
}) => {
  const landData = () => {
    const full = describeContent('land', land, ctx);
    const { effects, description } = splitSummary(full);
    return {
      title: `${landIcon} Land`,
      effects,
      requirements: [],
      effectsTitle: 'Developments',
      ...(description && { description }),
      bgClass: 'bg-gray-100 dark:bg-gray-700',
    };
  };
  const showLandCard = () => handleHoverCard(landData());
  const pinLandCard = () => pinHoverCard(landData());
  const animateSlots = useAnimate<HTMLDivElement>();
  return (
    <div
      className="relative panel-card p-2 text-center hoverable cursor-help"
      tabIndex={0}
      onMouseEnter={showLandCard}
      onMouseLeave={() => clearHoverCard()}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          pinLandCard();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          pinLandCard();
        }
      }}
    >
      <span className="font-medium">{landIcon} Land</span>
      <div
        ref={animateSlots}
        className="mt-1 flex flex-wrap justify-center gap-1"
      >
        {Array.from({ length: land.slotsMax }).map((_, i) => {
          const devId = land.developments[i];
          if (devId) {
            const name = ctx.developments.get(devId)?.name || devId;
            const title = `${ctx.developments.get(devId)?.icon || ''} ${name}`;
            const handleLeave = () => showLandCard();
            const full = describeContent('development', devId, ctx, {
              installed: true,
            });
            const { effects, description } = splitSummary(full);
            const data = {
              title,
              effects,
              requirements: [],
              ...(description && { description }),
              bgClass: 'bg-gray-100 dark:bg-gray-700',
            };
            return (
              <span
                key={i}
                tabIndex={0}
                className="panel-card p-1 text-xs hoverable cursor-help"
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  handleHoverCard(data);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  handleLeave();
                }}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    pinHoverCard(data);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    pinHoverCard(data);
                  }
                }}
              >
                {ctx.developments.get(devId)?.icon} {name}
              </span>
            );
          }
          const handleLeave = () => showLandCard();
          const data = {
            title: `${slotIcon} Development Slot (empty)`,
            effects: [],
            ...(developAction && {
              description: `Use ${developAction.icon || ''} ${developAction.name} to build here`,
            }),
            requirements: [],
            bgClass: 'bg-gray-100 dark:bg-gray-700',
          };
          return (
            <span
              key={i}
              tabIndex={0}
              className="panel-card p-1 text-xs hoverable cursor-help italic"
              onMouseEnter={(e) => {
                e.stopPropagation();
                handleHoverCard(data);
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                handleLeave();
              }}
              onClick={(e) => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  pinHoverCard(data);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  pinHoverCard(data);
                }
              }}
            >
              {slotIcon} -empty-
            </span>
          );
        })}
      </div>
    </div>
  );
};

const LandDisplay: React.FC<LandDisplayProps> = ({ player }) => {
  const { ctx, handleHoverCard, pinHoverCard, clearHoverCard } =
    useGameEngine();
  const developAction = useMemo(() => {
    const entry = Array.from(
      (
        ctx.actions as unknown as {
          map: Map<string, { category?: string; icon?: string; name: string }>;
        }
      ).map.entries(),
    ).find(([, a]) => a.category === 'development');
    if (!entry) return undefined;
    const [, info] = entry;
    return info.icon
      ? { icon: info.icon, name: info.name }
      : { name: info.name };
  }, [ctx]);
  if (player.lands.length === 0) return null;
  const animateLands = useAnimate<HTMLDivElement>();
  return (
    <div ref={animateLands} className="flex flex-wrap gap-2 mt-2 w-fit">
      {player.lands.map((land) => (
        <LandTile
          key={land.id}
          land={land}
          ctx={ctx}
          handleHoverCard={handleHoverCard}
          pinHoverCard={pinHoverCard}
          clearHoverCard={clearHoverCard}
          developAction={developAction}
        />
      ))}
    </div>
  );
};

export default LandDisplay;
