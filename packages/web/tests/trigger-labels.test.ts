import { describe, expect, it } from 'vitest';
import {
	createTriggerDescriptorEntry,
	formatTriggerLabel,
	resolveTriggerDescriptor,
} from '../src/utils/stats/triggerLabels';
import { defaultFormatDetail } from '../src/utils/stats/descriptorRegistry';

const LOOKUP = {
	'trigger:alpha': {
		icon: '🔥',
		label: 'Inferno',
		past: 'Inferno resolved',
		future: 'Ignite the inferno',
	},
	'trigger:beta': {
		future: 'Awaiting dawn',
	},
} as const;

describe('trigger labels', () => {
	it('resolves trigger descriptors from the provided lookup', () => {
		const descriptor = createTriggerDescriptorEntry(
			defaultFormatDetail,
			LOOKUP,
		);
		expect(descriptor.resolve('trigger:alpha')).toEqual({
			icon: '🔥',
			label: 'Inferno',
		});
		expect(resolveTriggerDescriptor(LOOKUP, 'trigger:beta')).toEqual({
			icon: '',
			label: 'Awaiting dawn',
		});
	});

	it('falls back to ids when metadata is missing', () => {
		const descriptor = createTriggerDescriptorEntry(defaultFormatDetail, {});
		expect(descriptor.resolve('trigger:gamma')).toEqual({
			icon: '',
			label: 'trigger:gamma',
		});
		expect(resolveTriggerDescriptor({}, undefined)).toEqual({
			icon: '',
			label: 'Trigger',
		});
	});

	it('formats trigger labels using injected metadata', () => {
		expect(formatTriggerLabel(LOOKUP, 'trigger:alpha')).toBe('🔥 Inferno');
		expect(formatTriggerLabel(LOOKUP, 'trigger:beta')).toBe('Awaiting dawn');
		expect(formatTriggerLabel({}, 'trigger:gamma')).toBe('trigger:gamma');
		expect(formatTriggerLabel(LOOKUP, '')).toBeUndefined();
	});
});
