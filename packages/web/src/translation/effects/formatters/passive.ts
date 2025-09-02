import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';
import { PHASES, PASSIVE_INFO } from '@kingdom-builder/contents';

registerEffectFormatter('passive', 'add', {
  summarize: (eff, ctx) => {
    const inner = summarizeEffects(eff.effects || [], ctx);
    const upkeepLabel =
      PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
    return eff.params?.['onUpkeepPhase']
      ? [
          {
            title: `${PASSIVE_INFO.icon} Until next ${upkeepLabel}`,
            items: inner,
          },
        ]
      : inner;
  },
  describe: (eff, ctx) => {
    const inner = describeEffects(eff.effects || [], ctx);
    const upkeepLabel =
      PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
    return eff.params?.['onUpkeepPhase']
      ? [
          {
            title: `${PASSIVE_INFO.icon} Until your next ${upkeepLabel} Phase`,
            items: inner,
          },
        ]
      : inner;
  },
  log: (eff, ctx) => {
    const inner = describeEffects(eff.effects || [], ctx);
    const items = [...(inner.length ? inner : [])];
    const upkeepLabel =
      PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
    if (eff.params?.['onUpkeepPhase'])
      items.push(
        `${PASSIVE_INFO.icon} ${PASSIVE_INFO.label} duration: Until player's next ${upkeepLabel} Phase`,
      );
    return { title: `${PASSIVE_INFO.icon} ${PASSIVE_INFO.label} added`, items };
  },
});
