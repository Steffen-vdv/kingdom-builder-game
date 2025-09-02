import React, { useMemo } from 'react';
import {
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { renderSummary } from '../../translation/render';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import Tooltip from '../common/Tooltip';

interface LandDisplayProps {
  player: EngineContext['activePlayer'];
}

const LandTile: React.FC<{
  land: EngineContext['activePlayer']['lands'][number];
  ctx: ReturnType<typeof useGameEngine>['ctx'];
  developAction?: { icon?: string; name: string } | undefined;
}> = ({ land, ctx, developAction }) => {
  const landSummary = describeContent('land', land, ctx);
  const landSplit = splitSummary(landSummary);
  const landTooltip = (
    <div>
      <div className="font-medium">{landIcon} Land</div>
      {landSplit.description && (
        <ul className="mt-1 list-disc pl-4">
          {renderSummary(landSplit.description)}
        </ul>
      )}
      {landSplit.effects.length > 0 && (
        <ul className="mt-1 list-disc pl-4">
          {renderSummary(landSplit.effects)}
        </ul>
      )}
    </div>
  );
  const animateSlots = useAnimate<HTMLDivElement>();
  return (
    <Tooltip content={landTooltip}>
      <div className="relative panel-card p-2 text-center hoverable cursor-default">
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
              const full = describeContent('development', devId, ctx, {
                installed: true,
              });
              const split = splitSummary(full);
              const devTooltip = (
                <div>
                  <div className="font-medium">{title}</div>
                  {split.description && (
                    <ul className="mt-1 list-disc pl-4">
                      {renderSummary(split.description)}
                    </ul>
                  )}
                  {split.effects.length > 0 && (
                    <ul className="mt-1 list-disc pl-4">
                      {renderSummary(split.effects)}
                    </ul>
                  )}
                </div>
              );
              return (
                <Tooltip key={i} content={devTooltip}>
                  <span className="panel-card p-1 text-xs hoverable cursor-default">
                    {ctx.developments.get(devId)?.icon} {name}
                  </span>
                </Tooltip>
              );
            }
            const emptyTooltip = (
              <div>
                <div className="font-medium">{slotIcon} Development Slot</div>
                {developAction && (
                  <div className="mt-1">
                    Use {developAction.icon || ''} {developAction.name} to build
                    here
                  </div>
                )}
              </div>
            );
            return (
              <Tooltip key={i} content={emptyTooltip}>
                <span className="panel-card p-1 text-xs hoverable cursor-default italic">
                  {slotIcon} -empty-
                </span>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </Tooltip>
  );
};

const LandDisplay: React.FC<LandDisplayProps> = ({ player }) => {
  const { ctx } = useGameEngine();
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
          developAction={developAction}
        />
      ))}
    </div>
  );
};

export default LandDisplay;
