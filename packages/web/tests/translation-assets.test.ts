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

	it('includes building keyword descriptor for PlayerPanel display', () => {
		// This test ensures the building asset descriptor is present, which is
		// required by AssetsRow.tsx for displaying the buildings category title.
		// Missing this descriptor causes a crash on game boot.
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{ resources: registries.resources },
			metadata,
			{ rules: ruleSnapshot },
		);
		expect(assets.building).toBeDefined();
		expect(assets.building).toMatchObject({
			icon: expect.any(String),
			label: expect.any(String),
			plural: expect.any(String),
		});
	});

	it('includes section labels for resource panel columns', () => {
		// Section labels are required for PlayerPanel economy/combat headers.
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{ resources: registries.resources },
			metadata,
			{ rules: ruleSnapshot },
		);
		expect(assets.sections).toBeDefined();
		expect(assets.sections.economy).toMatchObject({
			label: expect.any(String),
		});
		expect(assets.sections.combat).toMatchObject({ label: expect.any(String) });
	});
});
