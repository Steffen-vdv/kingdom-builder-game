import { createTranslationAssets } from '../../src/translation/context/assets';
import { createTestSessionScaffold } from './testSessionScaffold';

/**
 * Creates translation assets using the default test session scaffold.
 *
 * Uses the scaffold's registries (populations and resources), metadata, and rule snapshot to build the assets.
 *
 * @returns The created translation assets object.
 */
export function createDefaultTranslationAssets() {
	const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
	return createTranslationAssets(
		{
			populations: registries.populations,
			resources: registries.resources,
		},
		metadata,
		{ rules: ruleSnapshot },
	);
}