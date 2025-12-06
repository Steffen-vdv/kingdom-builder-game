import { describe, it, expect } from 'vitest';

import { PopulationTranslator } from '@kingdom-builder/web/translation/content/population';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

describe('PopulationTranslator metadata usage', () => {
	it('logs population role display using ResourceV2 metadata', () => {
		const { translationContext } = buildSyntheticTranslationContext();
		const translator = new PopulationTranslator();
		// Get grouped resource IDs from ResourceV2 metadata (abstract filtering)
		// Uses groupId to find grouped resources without hardcoding specific IDs
		const roleIds = translationContext.resourceMetadataV2
			.list()
			.filter((meta) => meta.groupId !== null && meta.groupId !== undefined)
			.map((meta) => meta.id);
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
