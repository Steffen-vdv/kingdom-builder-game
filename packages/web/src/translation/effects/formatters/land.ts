import { LAND_INFO, SLOT_INFO } from '@kingdom-builder/contents';
import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('land', 'add', {
  summarize: (eff) => {
    const count = Number(eff.params?.['count'] ?? 1);
    return `${LAND_INFO.icon}${signed(count)}${count}`;
  },
  describe: (eff) => {
    const count = Number(eff.params?.['count'] ?? 1);
    return `${LAND_INFO.icon} ${signed(count)}${count} ${LAND_INFO.label}`;
  },
});

registerEffectFormatter('land', 'till', {
  summarize: () => `${SLOT_INFO.icon}+1`,
  describe: () =>
    `Till ${LAND_INFO.icon} ${LAND_INFO.label} to unlock ${SLOT_INFO.icon} ${SLOT_INFO.label}`,
});
