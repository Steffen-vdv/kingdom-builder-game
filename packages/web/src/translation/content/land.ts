import type { EngineContext } from '@kingdom-builder/engine';
import { SLOT_ICON as slotIcon } from '@kingdom-builder/contents';
import {
  describeContent,
  summarizeContent,
  registerContentTranslator,
} from './factory';
import type { ContentTranslator, Land, Summary, SummaryEntry } from './types';

function translate(
  land: Land,
  ctx: EngineContext,
  fn: (
    type: string,
    target: unknown,
    ctx: EngineContext,
    opts?: Record<string, unknown>,
  ) => Summary,
): Summary {
  const items: SummaryEntry[] = [];
  for (let i = 0; i < land.slotsMax; i++) {
    const devId = land.developments[i];
    if (devId) {
      items.push({
        title: `${ctx.developments.get(devId)?.icon || ''} ${
          ctx.developments.get(devId)?.name || devId
        }`,
        items: fn('development', devId, ctx, { installed: true }),
      });
    } else {
      items.push(`${slotIcon} Empty development slot`);
    }
  }
  return items;
}

class LandTranslator implements ContentTranslator<Land> {
  summarize(land: Land, ctx: EngineContext): Summary {
    return translate(land, ctx, summarizeContent);
  }
  describe(land: Land, ctx: EngineContext): Summary {
    return translate(land, ctx, describeContent);
  }
}

registerContentTranslator('land', new LandTranslator());
