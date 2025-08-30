import { DEVELOPMENT_INFO as developmentInfo } from '@kingdom-builder/contents';
import { registerEffectFormatter } from '../factory';

registerEffectFormatter('development', 'add', {
  summarize: (eff) => {
    const id = eff.params?.['id'] as string;
    const icon = developmentInfo[id]?.icon || id;
    return `${icon}`;
  },
  describe: (eff) => {
    const id = eff.params?.['id'] as string;
    const info = developmentInfo[id];
    const label = info?.label || id;
    const icon = info?.icon || '';
    return `Add ${icon}${label}`;
  },
});

registerEffectFormatter('development', 'remove', {
  summarize: (eff) => {
    const id = eff.params?.['id'] as string;
    const icon = developmentInfo[id]?.icon || id;
    return `Remove ${icon}`;
  },
  describe: (eff) => {
    const id = eff.params?.['id'] as string;
    const info = developmentInfo[id];
    const label = info?.label || id;
    const icon = info?.icon || '';
    return `Remove ${icon}${label}`;
  },
});
