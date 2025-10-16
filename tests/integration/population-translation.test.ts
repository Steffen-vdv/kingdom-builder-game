import { describe, it, expect } from 'vitest';

import { PopulationTranslator } from '@kingdom-builder/web/translation/content/population';
import { selectPopulationRoleDisplay } from '@kingdom-builder/web/translation/context/assetSelectors';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

describe('PopulationTranslator metadata usage', () => {
	it('logs population role display using translation assets', () => {
		const { translationContext } = buildSyntheticTranslationContext();
		const translator = new PopulationTranslator();
		const roleIds = Object.keys(translationContext.assets.populations);
		const roleId = roleIds[0];
		expect(roleId, 'expected synthetic population role').toBeTruthy();
		const log = translator.log(roleId!, translationContext);
		const descriptor = selectPopulationRoleDisplay(
			translationContext.assets,
			roleId!,
		);
		const combined = [descriptor.icon, descriptor.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const fallback = descriptor.label ?? roleId ?? '';
		expect(log).toEqual([combined || fallback || '']);
	});
});
