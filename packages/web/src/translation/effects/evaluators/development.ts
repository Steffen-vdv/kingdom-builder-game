import { registerEvaluatorFormatter } from '../factory';

registerEvaluatorFormatter('development', {
	summarize: (evaluator, sub, translationContext) => {
		const developmentId = (evaluator.params as Record<string, string>)['id']!;
		let developmentDefinition:
			| { name?: string; icon?: string | undefined }
			| undefined;
		try {
			developmentDefinition =
				translationContext.developments.get(developmentId);
		} catch {
			/* ignore */
		}
		const icon = developmentDefinition?.icon || developmentId;
		const label = developmentDefinition?.name || developmentId;
		return sub.map((entry) =>
			typeof entry === 'string'
				? `${entry} per ${icon} ${label}`.trim()
				: { ...entry, title: `${entry.title} per ${icon} ${label}`.trim() },
		);
	},
	describe: (evaluator, sub, translationContext) => {
		const developmentId = (evaluator.params as Record<string, string>)['id']!;
		let developmentDefinition:
			| { name?: string; icon?: string | undefined }
			| undefined;
		try {
			developmentDefinition =
				translationContext.developments.get(developmentId);
		} catch {
			/* ignore */
		}
		const icon = developmentDefinition?.icon || '';
		const label = developmentDefinition?.name || developmentId;
		return sub.map((entry) =>
			typeof entry === 'string'
				? `${entry} for each ${icon} ${label}`.trim()
				: {
						...entry,
						title: `${entry.title} for each ${icon} ${label}`.trim(),
					},
		);
	},
});
