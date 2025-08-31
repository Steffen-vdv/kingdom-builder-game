import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('development', {
  summarize: (ev, sub, ctx) => {
    const devId = (ev.params as Record<string, string>)['id']!;
    let icon = devId;
    try {
      icon = ctx.developments.get(devId).icon || devId;
    } catch {
      /* ignore */
    }
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} per ${icon}`
        : { ...s, title: `${s.title} per ${icon}` },
    );
  },
  describe: (ev, sub, ctx) => {
    const devId = (ev.params as Record<string, string>)['id']!;
    let def: { name: string; icon?: string | undefined } | undefined;
    try {
      def = ctx.developments.get(devId);
    } catch {
      /* ignore */
    }
    return sub.map((s) =>
      typeof s === 'string'
        ? `${s} for each ${def?.icon || ''}${def?.name || devId}`
        : {
            ...s,
            title: `${s.title} for each ${def?.icon || ''}${def?.name || devId}`,
          },
    );
  },
});
