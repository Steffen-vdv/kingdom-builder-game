import { describe, expect, it } from 'vitest';
import { selectTriggerDisplay } from '../../src/translation/context/assetSelectors';
import { createTranslationAssets } from '../../src/translation/context/assets';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import { DEFAULT_TRIGGER_METADATA } from '../../src/contexts/defaultRegistryMetadata';

function getTriggerId(): string {
	const [triggerId] = Object.keys(DEFAULT_TRIGGER_METADATA ?? {});
	if (!triggerId) {
		throw new Error('Expected default trigger metadata to provide entries.');
	}
	return triggerId;
}

describe('selectTriggerDisplay', () => {
	it('returns trigger entries provided by translation assets', () => {
		const registries = createSessionRegistries();
		const triggerId = getTriggerId();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			{
				triggers: {
					[triggerId]: {
						icon: '🧪',
						label: 'Laboratory trigger',
						future: 'While laboratory tests run',
						past: 'Laboratory triggered',
					},
				},
			},
		);
		const triggerDisplay = selectTriggerDisplay(assets, triggerId);
		expect(triggerDisplay).toBe(assets.triggers[triggerId]);
		expect(triggerDisplay).toMatchObject({
			icon: '🧪',
			label: 'Laboratory trigger',
			future: 'While laboratory tests run',
			past: 'Laboratory triggered',
		});
	});

	it('falls back to the default trigger metadata when assets omit the entry', () => {
		const triggerId = getTriggerId();
		const defaultMetadata = DEFAULT_TRIGGER_METADATA?.[triggerId];
		if (!defaultMetadata) {
			throw new Error(
				'Expected default trigger metadata to include the entry.',
			);
		}
		const first = selectTriggerDisplay(undefined, triggerId);
		expect(first).toMatchObject({
			icon: defaultMetadata.icon,
			label: defaultMetadata.label ?? defaultMetadata.past,
			future: defaultMetadata.future,
			past: defaultMetadata.past,
		});
		const second = selectTriggerDisplay(undefined, triggerId);
		expect(second).toBe(first);
	});

	it('returns an empty trigger asset when metadata omits the trigger', () => {
		const registries = createSessionRegistries();
		const assets = createTranslationAssets({
			populations: registries.populations,
			resources: registries.resources,
		});
		const missing = selectTriggerDisplay(assets, 'trigger.unknown');
		expect(missing).toEqual({});
		expect(selectTriggerDisplay(assets, 'trigger.unknown')).toBe(missing);
	});
});
