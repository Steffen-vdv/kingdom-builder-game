import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';

registerEffectFormatter('passive', 'add', {
  summarize: (eff, ctx) => {
    const inner = summarizeEffects(eff.effects || [], ctx);
    return eff.params?.['onUpkeepPhase']
      ? [{ title: 'Until your next Upkeep Phase', items: inner }]
      : inner;
  },
  describe: (eff, ctx) => {
    const inner = describeEffects(eff.effects || [], ctx);
    return eff.params?.['onUpkeepPhase']
      ? [{ title: 'Until your next Upkeep Phase', items: inner }]
      : inner;
  },
});
