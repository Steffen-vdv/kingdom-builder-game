import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('development', {
	summarize: (ev, sub, ctx) => {
		const devId = (ev.params as Record<string, string>)['id']!;
		let def: { name?: string; icon?: string | undefined } | undefined;
		try {
			def = ctx.developments.get(devId);
		} catch {
			/* ignore */
		}
		const icon = def?.icon || devId;
		const label = def?.name || devId;
		return sub.map((s) =>
			typeof s === 'string'
				? `${s} per ${icon} ${label}`.trim()
				: { ...s, title: `${s.title} per ${icon} ${label}`.trim() },
		);
	},
	describe: (ev, sub, ctx) => {
		const devId = (ev.params as Record<string, string>)['id']!;
		let def: { name?: string; icon?: string | undefined } | undefined;
		try {
			def = ctx.developments.get(devId);
		} catch {
			/* ignore */
		}
		const icon = def?.icon || '';
		const label = def?.name || devId;
		return sub.map((s) =>
			typeof s === 'string'
				? `${s} for each ${icon} ${label}`.trim()
				: {
						...s,
						title: `${s.title} for each ${icon} ${label}`.trim(),
					},
		);
	},
});
