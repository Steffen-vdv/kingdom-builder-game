import {
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
} from '@kingdom-builder/contents';
import { gainOrLose, signed } from '../helpers';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('land', 'add', {
  summarize: (eff) => {
    const count = Number(eff.params?.['count'] ?? 1);
    return `${landIcon}${signed(count)}${count}`;
  },
  describe: (eff) => {
    const count = Number(eff.params?.['count'] ?? 1);
    return `${gainOrLose(count)} ${count} ${landIcon} Land`;
  },
});

registerEffectFormatter('land', 'till', {
  summarize: () => `${slotIcon}+1`,
  describe: () => `Till ${landIcon} to unlock ${slotIcon} slot`,
});
