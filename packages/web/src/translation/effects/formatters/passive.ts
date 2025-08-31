import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';

registerEffectFormatter('passive', 'add', {
  summarize: (eff, ctx) => {
    const inner = summarizeEffects(eff.effects || [], ctx);
    return eff.params?.['onUpkeepPhase']
      ? [{ title: '♾️ Until next Upkeep', items: inner }]
      : inner;
  },
  describe: (eff, ctx) => {
    const inner = describeEffects(eff.effects || [], ctx);
    return eff.params?.['onUpkeepPhase']
      ? [{ title: '♾️ Until your next Upkeep Phase', items: inner }]
      : inner;
  },
  log: (eff, ctx) => {
    const inner = describeEffects(eff.effects || [], ctx);
    const items = [...(inner.length ? inner : [])];
    if (eff.params?.['onUpkeepPhase'])
      items.push("♾️ Passive duration: Until player's next Upkeep Phase");
    return { title: '♾️ Passive added', items };
  },
});
