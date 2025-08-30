import { landIcon } from '../../../icons';
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
