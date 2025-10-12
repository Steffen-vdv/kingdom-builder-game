import { describe, it, expect } from 'vitest';

import { logContent } from '@kingdom-builder/web/translation/content';
import { createContentFactory } from '@kingdom-builder/testing';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

describe('Population content translation', () => {
	it('uses metadata descriptors when logging population roles', () => {
		const factory = createContentFactory();
		const population = factory.population({
			name: 'Archivists',
			icon: '📚',
		});
		const { translationContext } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				registries.populations.add(population.id, population);
				session.metadata = {
					...session.metadata,
					populations: {
						...session.metadata.populations,
						[population.id]: {
							label: 'Lorekeepers',
							icon: '📜',
						},
					},
				};
			},
		);
		const [entry] = logContent('population', population.id, translationContext);
		expect(entry).toContain('📜');
		expect(entry).toContain('Lorekeepers');
	});

	it('falls back to registry descriptors when metadata is unavailable', () => {
		const factory = createContentFactory();
		const population = factory.population({
			name: 'Guardians',
			icon: '🛡️',
		});
		const { translationContext } = buildSyntheticTranslationContext(
			({ registries }) => {
				registries.populations.add(population.id, population);
			},
		);
		const [entry] = logContent('population', population.id, translationContext);
		expect(entry).toContain(population.icon ?? '');
		expect(entry).toContain(population.name ?? population.id);
	});
});
