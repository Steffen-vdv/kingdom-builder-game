import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../src/translation/context/assets';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createEmptySnapshotMetadata } from './helpers/sessionFixtures';

describe('translation assets', () => {
	it('throws when stat metadata is missing', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const incompleteMetadata = {
			...metadata,
			stats: undefined,
		} as unknown as typeof metadata;
		delete (incompleteMetadata as Record<string, unknown>).stats;
		expect(() =>
			createTranslationAssets(
				{
					populations: registries.populations,
					resources: registries.resources,
				},
				incompleteMetadata,
				{ rules: ruleSnapshot },
			),
		).toThrowError('Translation assets require session metadata for stats.');
	});

	it('throws when critical asset descriptors are missing', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const missingAssets = {
			...metadata,
			assets: { ...metadata.assets },
		};
		delete (missingAssets.assets as Record<string, unknown>).passive;
		expect(() =>
			createTranslationAssets(registries, missingAssets, {
				rules: ruleSnapshot,
			}),
		).toThrowError(
			'Translation assets metadata is missing descriptor for assets.passive.',
		);
	});

	it('requires modifier descriptors when provided metadata lacks them', () => {
		const { registries, ruleSnapshot } = createTestSessionScaffold();
		const metadata = createEmptySnapshotMetadata();
		delete (metadata.assets as Record<string, unknown>).modifiers;
		expect(() =>
			createTranslationAssets(registries, metadata, { rules: ruleSnapshot }),
		).toThrowError(
			'Translation assets metadata must include assets.modifiers with cost and result descriptors.',
		);
	});
});
