import { describe, it, expect } from 'vitest';

import { PopulationTranslator } from '@kingdom-builder/web/translation/content/population';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

describe('PopulationTranslator metadata usage', () => {
	it('logs population role display using ResourceV2 metadata', () => {
		const { translationContext } = buildSyntheticTranslationContext();
		const translator = new PopulationTranslator();
		// Get population role IDs from ResourceV2 metadata
		const roleIds = translationContext.resourceMetadataV2
			.list()
			.filter((m) => m.id.includes('population'))
			.map((m) => m.id);
		const roleId = roleIds[0];
		expect(roleId, 'expected synthetic population role').toBeTruthy();
		const log = translator.log(roleId!, translationContext);
		const metadata = translationContext.resourceMetadataV2.get(roleId!);
		const combined = [metadata.icon, metadata.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const fallback = metadata.label || roleId || '';
		expect(log).toEqual([combined || fallback]);
	});
});
