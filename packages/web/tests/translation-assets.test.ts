import { describe, expect, it } from 'vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';

describe('translation assets', () => {
	it('throws when stat metadata is missing', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const metadataWithoutStats: SessionSnapshotMetadata = {
			...metadata,
			stats: undefined,
		};
		delete (metadataWithoutStats as { stats?: unknown }).stats;
		expect(() =>
			createTranslationAssets(
				{
					populations: registries.populations,
					resources: registries.resources,
				},
				metadataWithoutStats,
				{ rules: ruleSnapshot },
			),
		).toThrowError(
			'Session metadata is missing "stats" descriptors required to build translation assets.',
		);
	});

	it('throws when critical asset descriptors are missing', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const metadataWithoutLand: SessionSnapshotMetadata = {
			...metadata,
			assets: { ...metadata.assets },
		};
		delete (metadataWithoutLand.assets as Record<string, unknown>).land;
		expect(() =>
			createTranslationAssets(
				{
					populations: registries.populations,
					resources: registries.resources,
				},
				metadataWithoutLand,
				{ rules: ruleSnapshot },
			),
		).toThrowError(
			'Session metadata must include an "assets.land" descriptor to build translation assets.',
		);
	});

	it('builds assets from registry definitions and provided metadata', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			metadata,
			{ rules: ruleSnapshot },
		);
		expect(assets.land.label).toBe(metadata.assets?.land?.label);
		expect(assets.populations.council).toMatchObject({
			label: metadata.populations?.council?.label,
		});
		expect(assets.triggers['trigger.growth.start']).toMatchObject({
			icon: metadata.triggers?.['trigger.growth.start']?.icon,
		});
	});
});
