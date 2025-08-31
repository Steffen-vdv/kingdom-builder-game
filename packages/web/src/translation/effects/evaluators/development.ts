import { DEVELOPMENT_INFO as developmentInfo } from '@kingdom-builder/contents';
import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('development', {
  summarize: (ev, sub) => {
    const devId = (ev.params as Record<string, string>)['id']!;
    const icon = developmentInfo[devId]?.icon || devId;
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} per ${icon}`
        : { ...s, title: `${s.title} per ${icon}` },
    );
  },
  describe: (ev, sub) => {
    const devId = (ev.params as Record<string, string>)['id']!;
    const info = developmentInfo[devId];
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} for each ${info?.icon || ''}${info?.label || devId}`
        : {
            ...s,
            title: `${s.title} for each ${info?.icon || ''}${info?.label || devId}`,
          },
    );
  },
});
