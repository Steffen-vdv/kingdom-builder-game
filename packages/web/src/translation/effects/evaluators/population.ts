import type { SummaryEntry } from '../../content';
import type { TranslationContext } from '../../context';
import { registerEvaluatorFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

type PopulationEvaluator = {
	params?: Record<string, unknown>;
};

function formatSubEntries(
	subEntries: readonly SummaryEntry[],
	context: TranslationContext,
	role: string | undefined,
	mode: 'summarize' | 'describe',
): SummaryEntry[] {
	const { icon, label } = resolvePopulationDisplay(context, role);
	const suffix = mode === 'summarize' ? 'per' : 'for each';
	const display =
		mode === 'summarize' ? icon || label : `${icon} ${label}`.trim();
	return subEntries.map((entry) =>
		typeof entry === 'string'
			? `${entry} ${suffix} ${display}`.trim()
			: {
					...entry,
					title: `${entry.title} ${suffix} ${display}`.trim(),
				},
	);
}

registerEvaluatorFormatter('population', {
	summarize: (
		evaluator: PopulationEvaluator,
		subEntries: SummaryEntry[],
		context: TranslationContext,
	) => {
		const resourceId = evaluator.params?.['resourceId'] as string | undefined;
		return formatSubEntries(subEntries, context, resourceId, 'summarize');
	},
	describe: (
		evaluator: PopulationEvaluator,
		subEntries: SummaryEntry[],
		context: TranslationContext,
	) => {
		const resourceId = evaluator.params?.['resourceId'] as string | undefined;
		return formatSubEntries(subEntries, context, resourceId, 'describe');
	},
});
