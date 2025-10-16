import { describe, expect, it } from 'vitest';
import { createTranslationAssets } from '../../src/translation/context/assets';
import { selectTriggerDisplay } from '../../src/translation/context/assetSelectors';
import {
	DEFAULT_TRIGGER_METADATA,
	createDefaultRegistries,
	createDefaultRegistryMetadata,
} from '../../src/contexts/defaultRegistryMetadata';

type DefaultTriggerDescriptor = NonNullable<
	typeof DEFAULT_TRIGGER_METADATA
>[string];

function getFirstTriggerEntry(): [string, DefaultTriggerDescriptor] {
	const metadata = (DEFAULT_TRIGGER_METADATA ?? {}) as Record<
		string,
		DefaultTriggerDescriptor
	>;
	const entries = Object.entries(metadata);
	if (entries.length === 0) {
		throw new Error('Default trigger metadata is missing.');
	}
	const [triggerId, descriptor] = entries[0];
	if (!descriptor) {
		throw new Error(`Descriptor missing for trigger ${triggerId}`);
	}
	return [triggerId, descriptor];
}

describe('translation asset selectors', () => {
	it('resolves trigger displays through translation asset metadata', () => {
		const registries = createDefaultRegistries();
		const metadata = createDefaultRegistryMetadata();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			metadata,
		);
		const [triggerId, descriptor] = getFirstTriggerEntry();
		const display = selectTriggerDisplay(assets, triggerId);
		expect(display.icon).toBe(descriptor.icon);
		expect(display.future).toBe(descriptor.future);
		expect(display.past).toBe(descriptor.past);
		const expectedLabel = descriptor.label ?? descriptor.past;
		if (expectedLabel !== undefined) {
			expect(display.label).toBe(expectedLabel);
		}
	});

	it('falls back to default metadata when assets omit a trigger', () => {
		const [triggerId, descriptor] = getFirstTriggerEntry();
		const display = selectTriggerDisplay(undefined, triggerId);
		expect(display.icon).toBe(descriptor.icon);
		expect(display.future).toBe(descriptor.future);
		expect(display.past).toBe(descriptor.past);
		const expectedLabel = descriptor.label ?? descriptor.past;
		if (expectedLabel !== undefined) {
			expect(display.label).toBe(expectedLabel);
		}
	});
});
