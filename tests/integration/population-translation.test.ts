import { describe, it, expect } from 'vitest';

import { PopulationTranslator } from '../../packages/web/src/translation/content/population';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

describe('PopulationTranslator metadata', () => {
	it('resolves icons and labels from translation assets', () => {
		const { translationContext, registries } = buildSyntheticTranslationContext(
			({ session, registries: sessionRegistries }) => {
				const [firstRole] = Array.from(sessionRegistries.populations.keys());
				if (!firstRole) {
					throw new TypeError(
						'Synthetic content factory returned no population roles',
					);
				}
				const metadata = session.metadata;
				metadata.populations = {
					...(metadata.populations ?? {}),
					[firstRole]: {
						icon: '🦊',
						label: 'Trickster',
					},
				};
				metadata.assets = {
					...(metadata.assets ?? {}),
					population: {
						icon: '🛖',
						label: 'Homesteaders',
					},
				};
			},
		);

		const translator = new PopulationTranslator();
		const [roleId] = Array.from(registries.populations.keys());
		if (!roleId) {
			throw new TypeError('Missing population role definition');
		}

		const [roleLog] = translator.log(roleId, translationContext);
		expect(roleLog).toBe('🦊 Trickster');

		const [defaultLog] = translator.log('', translationContext);
		expect(defaultLog).toBe('🛖 Homesteaders');
	});
});
