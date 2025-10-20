import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';

describe('translation assets', () => {
	it('derives stat and asset descriptors directly from snapshot metadata', () => {
		const { registries, ruleSnapshot, metadata } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			metadata,
			{ rules: ruleSnapshot },
		);
		expect(assets.land).toMatchObject({
			label: 'Frontier Land',
			icon: '🛤️',
		});
		expect(assets.stats.growth).toMatchObject({
			label: 'Growth Rate',
			displayAsPercent: true,
		});
	});

	it('throws when required asset descriptors are missing', () => {
		const { registries, ruleSnapshot, metadata } = createTestSessionScaffold();
		const invalidMetadata = {
			...metadata,
			assets: { ...metadata.assets },
		};
		delete invalidMetadata.assets?.passive;
		expect(() =>
			createTranslationAssets(
				{
					populations: registries.populations,
					resources: registries.resources,
				},
				invalidMetadata,
				{ rules: ruleSnapshot },
			),
		).toThrowError('assets.passive');
	});
});
