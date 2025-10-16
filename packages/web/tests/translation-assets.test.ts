import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { DEFAULT_REGISTRY_METADATA } from '../src/contexts/defaultRegistryMetadata';

const createAssets = (
	metadata?: Parameters<typeof createTranslationAssets>[1],
) => {
	const registries = createSessionRegistries();
	return createTranslationAssets(
		{
			populations: registries.populations,
			resources: registries.resources,
		},
		metadata,
	);
};

describe('createTranslationAssets', () => {
	it('uses default registry metadata as the base asset descriptors', () => {
		const assets = createAssets();
		const populationMetadata = DEFAULT_REGISTRY_METADATA.assets?.population;
		if (populationMetadata) {
			expect(assets.population).toMatchObject(populationMetadata);
		}
	});

	it('falls back to emoji defaults when metadata omits an asset entry', () => {
		const assets = createAssets();
		expect(assets.upkeep).toMatchObject({ icon: '🧹', label: 'Upkeep' });
	});

	it('merges runtime metadata over the registry defaults for assets', () => {
		const assets = createAssets({
			assets: {
				upkeep: { label: 'Maintenance', icon: '🛠️' },
			},
		});
		expect(assets.upkeep).toMatchObject({ label: 'Maintenance', icon: '🛠️' });
	});

	it('derives trigger icons and labels from registry metadata', () => {
		const assets = createAssets();
		const triggerId = 'onGrowthPhase';
		const triggerMetadata = DEFAULT_REGISTRY_METADATA.triggers?.[triggerId];
		if (!triggerMetadata) {
			throw new Error(
				'Expected default registry metadata to provide trigger info.',
			);
		}
		expect(assets.triggers[triggerId]).toMatchObject({
			icon: triggerMetadata.icon,
			label: triggerMetadata.label ?? triggerMetadata.past,
			future: triggerMetadata.future,
			past: triggerMetadata.past,
		});
	});

	it('merges runtime trigger metadata over the defaults', () => {
		const triggerId = 'onGrowthPhase';
		const assets = createAssets({
			triggers: {
				[triggerId]: {
					icon: '🌟',
					label: 'Starlight Growth',
					future: 'Whenever growth occurs',
					past: 'Starlight Growth Trigger',
				},
			},
		});
		expect(assets.triggers[triggerId]).toMatchObject({
			icon: '🌟',
			label: 'Starlight Growth',
			future: 'Whenever growth occurs',
			past: 'Starlight Growth Trigger',
		});
	});
});
