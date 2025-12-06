import type { SummaryEntry } from '../../content';
import type { TranslationContext } from '../../context';
import { registerEvaluatorFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';

type ResourceEvaluator = {
	params?: Record<string, unknown>;
};

function formatSubEntries(
	subEntries: readonly SummaryEntry[],
	context: TranslationContext,
	resourceId: string | undefined,
	mode: 'summarize' | 'describe',
): SummaryEntry[] {
	// Try to get resource metadata for the resourceId
	const metadata = resourceId
		? context.resourceMetadataV2.get(resourceId)
		: null;

	// If no resourceId or no metadata, fall back to population display logic
	// (for backward compatibility with tests that pass empty params)
	if (!metadata || !metadata.icon) {
		const popDisplay = resolvePopulationDisplay(context, resourceId);
		const suffix = mode === 'summarize' ? 'per' : 'for each';
		const display =
			mode === 'summarize'
				? popDisplay.icon || popDisplay.label
				: `${popDisplay.icon} ${popDisplay.label}`.trim();
		return subEntries.map((entry) =>
			typeof entry === 'string'
				? `${entry} ${suffix} ${display}`.trim()
				: {
						...entry,
						title: `${entry.title} ${suffix} ${display}`.trim(),
					},
		);
	}

	// Use the resource's own icon and label
	const suffix = mode === 'summarize' ? 'per' : 'for each';
	const display =
		mode === 'summarize'
			? metadata.icon || metadata.label
			: `${metadata.icon ?? ''} ${metadata.label}`.trim();

	return subEntries.map((entry) =>
		typeof entry === 'string'
			? `${entry} ${suffix} ${display}`.trim()
			: {
					...entry,
					title: `${entry.title} ${suffix} ${display}`.trim(),
				},
	);
}

registerEvaluatorFormatter('resource', {
	summarize: (
		evaluator: ResourceEvaluator,
		subEntries: SummaryEntry[],
		context: TranslationContext,
	) => {
		const resourceId = evaluator.params?.['resourceId'] as string | undefined;
		return formatSubEntries(subEntries, context, resourceId, 'summarize');
	},
	describe: (
		evaluator: ResourceEvaluator,
		subEntries: SummaryEntry[],
		context: TranslationContext,
	) => {
		const resourceId = evaluator.params?.['resourceId'] as string | undefined;
		return formatSubEntries(subEntries, context, resourceId, 'describe');
	},
});
