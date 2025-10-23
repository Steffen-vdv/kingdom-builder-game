import { createTranslationAssets } from '../../src/translation/context/assets';
import { createTranslationResourceV2Registry } from '../../src/translation/resourceV2';
import { createTestSessionScaffold } from './testSessionScaffold';

export function createDefaultTranslationAssets() {
	const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
	const resourceV2 = createTranslationResourceV2Registry(
		registries.resourceDefinitions,
		registries.resourceGroups,
	);
	return createTranslationAssets(
		{
			populations: registries.populations,
			resources: registries.resources,
		},
		metadata,
		{ rules: ruleSnapshot, resourceV2 },
	);
}
