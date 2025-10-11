import { registerEvaluatorFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

registerEvaluatorFormatter('population', {
	summarize: (evaluator, sub, context) => {
		const rawRole = evaluator.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const { icon, label } = resolvePopulationDisplay(context, role);
		return sub.map((summaryEntry) =>
			typeof summaryEntry === 'string'
				? `${summaryEntry} per ${icon} ${label}`.trim()
				: {
						...summaryEntry,
						title: `${summaryEntry.title} per ${icon} ${label}`.trim(),
					},
		);
	},
	describe: (evaluator, sub, context) => {
		const rawRole = evaluator.params?.['role'];
		const role = typeof rawRole === 'string' ? rawRole : undefined;
		const { icon, label } = resolvePopulationDisplay(context, role);
		return sub.map((summaryEntry) =>
			typeof summaryEntry === 'string'
				? `${summaryEntry} for each ${icon} ${label}`.trim()
				: {
						...summaryEntry,
						title: `${summaryEntry.title} for each ${icon} ${label}`.trim(),
					},
		);
	},
});
