import { createTranslationAssets } from '../../src/translation/context/assets';
import { createSessionRegistries } from './sessionRegistries';

export function createDefaultTranslationAssets() {
	const registries = createSessionRegistries();
	return createTranslationAssets({
		populations: registries.populations,
		resources: registries.resources,
	});
}
