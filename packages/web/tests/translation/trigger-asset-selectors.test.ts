import { describe, expect, it } from 'vitest';
import { selectTriggerDisplay } from '../../src/translation/context/assetSelectors';
import { createTranslationAssets } from '../../src/translation/context/assets';
import {
	DEFAULT_REGISTRIES,
	DEFAULT_REGISTRY_METADATA,
	DEFAULT_TRIGGER_METADATA,
} from '../../src/contexts/defaultRegistryMetadata';

describe('selectTriggerDisplay', () => {
	it('returns trigger metadata supplied through translation assets', () => {
		const triggerId = Object.keys(DEFAULT_TRIGGER_METADATA ?? {})[0];
		if (!triggerId) {
			throw new Error('Expected default trigger metadata to define entries.');
		}
		const override = {
			icon: '🧪',
			future: 'In the lab',
			past: 'Lab work',
			label: 'Experiment phase',
		} as const;
		const assets = createTranslationAssets(DEFAULT_REGISTRIES, {
			...DEFAULT_REGISTRY_METADATA,
			triggers: {
				...(DEFAULT_REGISTRY_METADATA.triggers ?? {}),
				[triggerId]: { ...override },
			},
		});
		const display = selectTriggerDisplay(assets, triggerId);
		expect(display).toMatchObject(override);
	});

	it('falls back to default metadata when assets are unavailable', () => {
		const [triggerId, triggerInfo] = Object.entries(
			DEFAULT_TRIGGER_METADATA ?? {},
		)[0] ?? [undefined, undefined];
		if (!triggerId || !triggerInfo) {
			throw new Error('Expected default trigger metadata to define entries.');
		}
		const display = selectTriggerDisplay(undefined, triggerId);
		expect(display).toMatchObject({
			icon: triggerInfo.icon,
			future: triggerInfo.future,
			past: triggerInfo.past,
			label: triggerInfo.label ?? triggerInfo.past,
		});
	});

	it('returns a stable empty descriptor when metadata is missing', () => {
		const first = selectTriggerDisplay(undefined, 'trigger:missing');
		const second = selectTriggerDisplay(undefined, 'trigger:missing');
		expect(first).toBe(second);
		expect(first).toEqual({});
	});
});
