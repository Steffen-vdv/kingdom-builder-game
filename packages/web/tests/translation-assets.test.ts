import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createTranslationResourceV2Registry } from '../src/translation/resourceV2';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';

describe('translation assets', () => {
	it(
		'uses provided metadata descriptors for critical assets ' + 'and stats',
		() => {
			const { registries, metadata, ruleSnapshot } =
				createTestSessionScaffold();
			const resourceV2 = createTranslationResourceV2Registry(
				[
					{
						id: 'gold',
						display: {
							name: 'Royal Treasury',
							icon: '👑',
							description: 'Crown-controlled ' + 'reserves.',
							order: 1,
						},
						bounds: { lowerBound: 0 },
					},
				],
				[],
			);
			const assets = createTranslationAssets(
				{
					populations: registries.populations,
					resources: registries.resources,
				},
				metadata,
				{ rules: ruleSnapshot, resourceV2 },
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
		},
	);

	it('throws when required asset descriptors are missing', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const resourceV2 = createTranslationResourceV2Registry([], []);
		const metadataWithoutLand = {
			...metadata,
			assets: { ...metadata.assets },
		};
		delete metadataWithoutLand.assets.land;
		expect(() =>
			createTranslationAssets(
				{
					populations: registries.populations,
					resources: registries.resources,
				},
				metadataWithoutLand as typeof metadata,
				{ rules: ruleSnapshot, resourceV2 },
			),
		).toThrowError(/assets\.land/);
	});

	it('prefers ResourceV2 display metadata when available', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const resourceV2 = createTranslationResourceV2Registry(
			[
				{
					id: 'gold',
					display: {
						name: 'Royal Treasury',
						icon: '👑',
						description: 'Crown-controlled ' + 'reserves.',
						order: 1,
					},
					bounds: { lowerBound: 0 },
				},
			],
			[],
		);
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			metadata,
			{ rules: ruleSnapshot, resourceV2 },
		);
		expect(assets.resources.gold).toMatchObject({
			label: 'Royal Treasury',
			icon: '👑',
			description: 'Crown-controlled ' + 'reserves.',
		});
	});
});
