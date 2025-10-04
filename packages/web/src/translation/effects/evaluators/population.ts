import type { PopulationRoleId } from '@kingdom-builder/contents';
import { registerEvaluatorFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

registerEvaluatorFormatter('population', {
	summarize: (evaluator, sub) => {
		const role = (evaluator.params as Record<string, string>)?.['role'] as
			| PopulationRoleId
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
		return sub.map((summaryEntry) =>
			typeof summaryEntry === 'string'
				? `${summaryEntry} per ${icon} ${label}`.trim()
				: {
						...summaryEntry,
						title: `${summaryEntry.title} per ${icon} ${label}`.trim(),
					},
		);
	},
	describe: (evaluator, sub) => {
		const role = (evaluator.params as Record<string, string>)?.['role'] as
			| PopulationRoleId
			| undefined;
		const { icon, label } = resolvePopulationDisplay(role);
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
