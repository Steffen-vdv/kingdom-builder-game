import type { SessionTriggerMetadata } from '@kingdom-builder/protocol/session';
import { describe, expect, it } from 'vitest';
import { DEFAULT_TRIGGER_METADATA } from '../src/contexts/defaultRegistryMetadata';
import {
	createTriggerDescriptorEntry,
	formatTriggerLabel,
	resolveTriggerDescriptor,
} from '../src/utils/stats/triggerLabels';
import type { DescriptorRegistryEntry } from '../src/utils/stats/types';

const EMPTY_FORMAT: NonNullable<DescriptorRegistryEntry['formatDetail']> = () =>
	undefined;

describe('trigger label helpers', () => {
	it('resolves trigger descriptors from provided metadata', () => {
		const metadata = Object.freeze({
			'trigger.test': Object.freeze({
				icon: '🧪',
				past: 'Experiment Resolved',
			}),
		}) satisfies Readonly<Record<string, SessionTriggerMetadata>>;
		const resolved = resolveTriggerDescriptor(metadata, 'trigger.test');
		expect(resolved.icon).toBe('🧪');
		expect(resolved.label).toBe('Experiment Resolved');
	});

	it('falls back to default trigger metadata when lookup entries are missing', () => {
		const fallbackKey = Object.keys(DEFAULT_TRIGGER_METADATA)[0];
		expect(fallbackKey).toBeDefined();
		const fallbackEntry = fallbackKey && DEFAULT_TRIGGER_METADATA[fallbackKey];
		if (!fallbackKey || !fallbackEntry) {
			throw new Error('Expected default trigger metadata to provide entries.');
		}
		const emptyMetadata = Object.freeze({}) as Readonly<
			Record<string, SessionTriggerMetadata>
		>;
		const resolved = resolveTriggerDescriptor(emptyMetadata, fallbackKey);
		expect(resolved.icon).toBe(fallbackEntry.icon ?? '');
		const expectedLabel =
			fallbackEntry.past ??
			fallbackEntry.label ??
			fallbackEntry.future ??
			fallbackKey;
		expect(resolved.label).toBe(expectedLabel);
	});

	it('formats trigger labels with icon prefixes when available', () => {
		const metadata = Object.freeze({
			'trigger.iconic': Object.freeze({
				icon: '🔥',
				label: 'Combustion',
			}),
		}) satisfies Readonly<Record<string, SessionTriggerMetadata>>;
		const formatted = formatTriggerLabel(metadata, 'trigger.iconic');
		expect(formatted).toBe('🔥 Combustion');
	});

	it('uses fallback descriptors when formatting without metadata', () => {
		const fallbackKey = Object.keys(DEFAULT_TRIGGER_METADATA)[0];
		if (!fallbackKey) {
			throw new Error('Expected default trigger metadata to provide entries.');
		}
		const descriptor = createTriggerDescriptorEntry(undefined, EMPTY_FORMAT);
		const resolved = descriptor.resolve(fallbackKey);
		const fallbackEntry = DEFAULT_TRIGGER_METADATA[fallbackKey];
		expect(resolved.icon).toBe(fallbackEntry?.icon ?? '');
		const expectedLabel =
			fallbackEntry?.past ??
			fallbackEntry?.label ??
			fallbackEntry?.future ??
			fallbackKey;
		expect(resolved.label).toBe(expectedLabel);
		const formatted = formatTriggerLabel(undefined, fallbackKey);
		expect(formatted).toBe(
			[resolved.icon, resolved.label]
				.filter((value) => value.trim().length > 0)
				.join(' ')
				.trim(),
		);
	});
});
