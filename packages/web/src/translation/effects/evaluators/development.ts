import { developmentInfo } from '../../../icons';
import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('development', {
  summarize: (ev, sub) => {
    const devId = (ev.params as Record<string, string>)['id']!;
    const icon = developmentInfo[devId]?.icon || devId;
    return sub.map((s) => `${s} per ${icon}`);
  },
  describe: (ev, sub) => {
    const devId = (ev.params as Record<string, string>)['id']!;
    const info = developmentInfo[devId];
    return sub.map(
      (s) => `${s} for each ${info?.icon || ''}${info?.label || devId}`,
    );
  },
});
