import { describe, expect, it } from 'vitest';
import { DEFAULT_TRIGGER_METADATA } from '../../src/contexts/defaultRegistryMetadata';
import { selectTriggerDisplay } from '../../src/translation/context/assetSelectors';
import { createTranslationAssets } from '../../src/translation/context/assets';
import { createSessionRegistries } from '../helpers/sessionRegistries';

describe('trigger asset selectors', () => {
	it('prefers metadata embedded in translation assets', () => {
		const registries = createSessionRegistries();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			{
				triggers: {
					'trigger.synthetic': {
						icon: '🧪',
						label: 'Synthetic Trigger',
						past: 'Synthetic Trigger Past',
						future: 'Synthetic Trigger Future',
					},
				},
			},
		);
		const result = selectTriggerDisplay(assets, 'trigger.synthetic');
		const entry = assets.triggers['trigger.synthetic'];
		expect(result).toBe(entry);
		expect(result.icon).toBe('🧪');
		expect(result.label).toBe('Synthetic Trigger');
		expect(result.past).toBe('Synthetic Trigger Past');
		expect(selectTriggerDisplay(assets, 'trigger.synthetic')).toBe(result);
	});

	it('falls back to default trigger metadata when entries are missing', () => {
		const fallbackKey = Object.keys(DEFAULT_TRIGGER_METADATA)[0];
		expect(fallbackKey).toBeDefined();
		if (!fallbackKey) {
			throw new Error('Expected default trigger metadata to provide entries.');
		}
		const fallbackEntry = DEFAULT_TRIGGER_METADATA[fallbackKey];
		const registries = createSessionRegistries();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
			},
			{ triggers: {} },
		);
		const result = selectTriggerDisplay(assets, fallbackKey);
		expect(selectTriggerDisplay(assets, fallbackKey)).toBe(result);
		const expectedLabel =
			fallbackEntry?.label ??
			fallbackEntry?.past ??
			fallbackEntry?.future ??
			fallbackKey;
		expect(result.icon).toBe(fallbackEntry?.icon);
		expect(result.label).toBe(expectedLabel);
		const defaultOnly = selectTriggerDisplay(undefined, fallbackKey);
		expect(defaultOnly.icon).toBe(fallbackEntry?.icon);
		expect(defaultOnly.label).toBe(expectedLabel);
		expect(selectTriggerDisplay(undefined, fallbackKey)).toBe(defaultOnly);
	});

	it('memoizes synthesized fallback assets for unknown triggers', () => {
		const first = selectTriggerDisplay(undefined, 'trigger.unknown.synthetic');
		const second = selectTriggerDisplay(undefined, 'trigger.unknown.synthetic');
		expect(second).toBe(first);
		expect(first.label).toBe('trigger.unknown.synthetic');
	});
});
