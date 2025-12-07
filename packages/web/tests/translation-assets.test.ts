import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';

describe('translation assets', () => {
	it('uses provided metadata descriptors for critical assets', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{
				resources: registries.resources,
			},
			metadata,
			{ rules: ruleSnapshot },
		);
		expect(assets.land).toMatchObject({
			icon: metadata.assets?.land?.icon,
			label: metadata.assets?.land?.label,
			description: metadata.assets?.land?.description,
		});
		expect(assets.passive).toMatchObject({
			icon: metadata.assets?.passive?.icon,
			label: metadata.assets?.passive?.label,
			description: metadata.assets?.passive?.description,
		});
		// Stats are now resources under ResourceV2 - no separate stats object
	});

	it('throws when required asset descriptors are missing', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const metadataWithoutLand = {
			...metadata,
			assets: { ...metadata.assets },
		};
		delete metadataWithoutLand.assets.land;
		expect(() =>
			createTranslationAssets(
				{
					resources: registries.resources,
				},
				metadataWithoutLand as typeof metadata,
				{ rules: ruleSnapshot },
			),
		).toThrowError(/assets\.land/);
	});
});
