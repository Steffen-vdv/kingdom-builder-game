import { createTranslationAssets } from '../../src/translation/context/assets';
import { createTestSessionScaffold } from './testSessionScaffold';

export function createDefaultTranslationAssets() {
	const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
	return createTranslationAssets(
		{
			populations: registries.populations,
			resources: registries.resources,
			resourceDefinitions: registries.resourceDefinitions,
			resourceGroups: registries.resourceGroups,
		},
		metadata,
		{ rules: ruleSnapshot },
	);
}
