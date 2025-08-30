import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';

registerEffectFormatter('passive', 'add', {
  summarize: (eff, ctx) => summarizeEffects(eff.effects || [], ctx),
  describe: (eff, ctx) => describeEffects(eff.effects || [], ctx),
});
