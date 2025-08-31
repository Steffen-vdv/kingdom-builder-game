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
  clearHoverCard: ReturnType<typeof useGameEngine>['clearHoverCard'];
  developAction?: { icon?: string; name: string } | undefined;
}> = ({ land, ctx, handleHoverCard, clearHoverCard, developAction }) => {
  const showLandCard = () => {
    const full = describeContent('land', land, ctx);
    const { effects, description } = splitSummary(full);
    handleHoverCard({
      title: `${landIcon} Land`,
      effects,
      requirements: [],
      effectsTitle: 'Developments',
      ...(description && { description }),
      bgClass: 'bg-gray-100 dark:bg-gray-700',
    });
  };
  const animateSlots = useAnimate<HTMLDivElement>();
  return (
    <div
      className="relative panel-card p-2 text-center hoverable cursor-help"
      onMouseEnter={showLandCard}
      onMouseLeave={clearHoverCard}
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
            return (
              <span
                key={i}
                className="panel-card p-1 text-xs hoverable cursor-help"
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  const full = describeContent('development', devId, ctx, {
                    installed: true,
                  });
                  const { effects, description } = splitSummary(full);
                  handleHoverCard({
                    title,
                    effects,
                    requirements: [],
                    ...(description && { description }),
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
                  ...(developAction && {
                    description: `Use ${developAction.icon || ''} ${developAction.name} to build here`,
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
              {slotIcon} -empty-
            </span>
          );
        })}
      </div>
    </div>
  );
};

const LandDisplay: React.FC<LandDisplayProps> = ({ player }) => {
  const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
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
          clearHoverCard={clearHoverCard}
          developAction={developAction}
        />
      ))}
    </div>
  );
};

export default LandDisplay;
