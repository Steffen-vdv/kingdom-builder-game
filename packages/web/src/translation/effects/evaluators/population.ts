import type { SessionPopulationRoleId } from '@kingdom-builder/protocol/session';
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
	role: SessionPopulationRoleId | undefined,
	mode: 'summarize' | 'describe',
): SummaryEntry[] {
	const { icon, label } = resolvePopulationDisplay(context, role);
	const suffix = mode === 'summarize' ? 'per' : 'for each';
	return subEntries.map((entry) =>
		typeof entry === 'string'
			? `${entry} ${suffix} ${icon} ${label}`.trim()
			: {
					...entry,
					title: `${entry.title} ${suffix} ${icon} ${label}`.trim(),
				},
	);
}

registerEvaluatorFormatter('population', {
	summarize: (
		evaluator: PopulationEvaluator,
		subEntries: SummaryEntry[],
		context: TranslationContext,
	) => {
		const role = evaluator.params?.['role'] as
			| SessionPopulationRoleId
			| undefined;
		return formatSubEntries(subEntries, context, role, 'summarize');
	},
	describe: (
		evaluator: PopulationEvaluator,
		subEntries: SummaryEntry[],
		context: TranslationContext,
	) => {
		const role = evaluator.params?.['role'] as
			| SessionPopulationRoleId
			| undefined;
		return formatSubEntries(subEntries, context, role, 'describe');
	},
});
