import type { PopulationRoleId } from '@kingdom-builder/contents';
import { registerEvaluatorFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

registerEvaluatorFormatter('population', {
	summarize: (ev, sub) => {
		const role = (ev.params as Record<string, string>)?.['role'] as
			| PopulationRoleId
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return sub.map((s) =>
			typeof s === 'string'
				? `${s} per ${icon} ${label}`.trim()
				: { ...s, title: `${s.title} per ${icon} ${label}`.trim() },
		);
	},
	describe: (ev, sub) => {
		const role = (ev.params as Record<string, string>)?.['role'] as
			| PopulationRoleId
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return sub.map((s) =>
			typeof s === 'string'
				? `${s} for each ${icon} ${label}`.trim()
				: { ...s, title: `${s.title} for each ${icon} ${label}`.trim() },
		);
	},
});
