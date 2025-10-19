import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';

describe('translation assets', () => {
	it('falls back to default stat metadata when snapshot metadata omits stats', () => {
		const { registries, ruleSnapshot } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			undefined,
			{ rules: ruleSnapshot },
		);
		expect(assets.stats.fortificationStrength).toMatchObject({
			icon: '🛡️',
			label: 'Fortification Strength',
		});
		expect(assets.stats.absorption).toMatchObject({
			icon: '🌀',
			label: 'Absorption',
		});
	});
});
