import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';

describe('translation assets', () => {
	it('uses provided metadata descriptors for critical assets and stats', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
				resourceDefinitions: registries.resourceDefinitions,
				resourceGroups: registries.resourceGroups,
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
		expect(assets.stats.maxPopulation).toMatchObject({
			icon: metadata.stats?.maxPopulation?.icon,
			label: metadata.stats?.maxPopulation?.label,
			description: metadata.stats?.maxPopulation?.description,
		});
	});

	it('throws when required asset descriptors are missing', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const metadataWithoutLand = {
			...metadata,
			assets: { ...metadata.assets },
		};
		delete metadataWithoutLand.assets.land;
		const typedMetadata = metadataWithoutLand as typeof metadata;
		const createAssets = () =>
			createTranslationAssets(
				{
					populations: registries.populations,
					resources: registries.resources,
					resourceDefinitions: registries.resourceDefinitions,
					resourceGroups: registries.resourceGroups,
				},
				typedMetadata,
				{ rules: ruleSnapshot },
			);
		expect(createAssets).toThrowError(/assets\.land/);
	});
});
