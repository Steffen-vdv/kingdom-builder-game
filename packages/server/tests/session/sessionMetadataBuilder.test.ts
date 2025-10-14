import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	TRIGGER_INFO,
	OVERVIEW_CONTENT,
	STATS,
} from '@kingdom-builder/contents';
import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';
import { buildSessionMetadata } from '../../src/session/sessionMetadataBuilder.js';

type PercentAwareDescriptor = SessionMetadataDescriptor & {
	displayAsPercent?: boolean;
	format?: unknown;
};

describe('sessionMetadataBuilder', () => {
	it('clones registry entries without sharing references', () => {
		const { registries } = buildSessionMetadata();
		const [actionId, actionDefinition] = ACTIONS.entries()[0];
		expect(actionId).toBeTruthy();
		if (!actionId) {
			return;
		}
		const clonedDefinition = registries.actions[actionId];
		expect(clonedDefinition).toStrictEqual(actionDefinition);
		expect(clonedDefinition).not.toBe(actionDefinition);
		expect(Object.isFrozen(clonedDefinition)).toBe(true);
		expect(Object.isFrozen(registries.actions)).toBe(true);
	});

	it('includes trigger metadata with icon references', () => {
		const { metadata } = buildSessionMetadata();
		const [triggerId, triggerInfo] = Object.entries(TRIGGER_INFO)[0];
		expect(triggerId).toBeTruthy();
		if (!triggerId) {
			return;
		}
		const triggerMetadata = metadata.triggers?.[triggerId];
		expect(triggerMetadata).toBeDefined();
		expect(triggerMetadata?.icon).toBe(triggerInfo.icon);
		expect(triggerMetadata?.future).toBe(triggerInfo.future);
		expect(Object.isFrozen(metadata.triggers)).toBe(true);
	});

	it('preserves stat formatting markers', () => {
		const { metadata } = buildSessionMetadata();
		const percentEntry = Object.entries(STATS).find(([, info]) => {
			return info.displayAsPercent === true;
		});
		expect(percentEntry).toBeDefined();
		if (!percentEntry) {
			return;
		}
		const [statKey, statInfo] = percentEntry;
		const statMetadata = metadata.stats?.[statKey] as
			| PercentAwareDescriptor
			| undefined;
		expect(statMetadata).toBeDefined();
		if (!statMetadata) {
			return;
		}
		expect((statMetadata as PercentAwareDescriptor).displayAsPercent).toBe(
			statInfo.displayAsPercent,
		);
		if (statInfo.addFormat) {
			expect((statMetadata as PercentAwareDescriptor).format).toStrictEqual(
				statInfo.addFormat,
			);
		}
	});

	it('clones overview hero tokens for independent use', () => {
		const { overviewContent } = buildSessionMetadata();
		expect(overviewContent).not.toBe(OVERVIEW_CONTENT);
		const heroTokenEntries = Object.entries(OVERVIEW_CONTENT.hero.tokens);
		expect(heroTokenEntries.length).toBeGreaterThan(0);
		for (const [tokenKey, tokenValue] of heroTokenEntries) {
			expect(overviewContent.hero.tokens[tokenKey]).toBe(tokenValue);
		}
		expect(Object.isFrozen(overviewContent)).toBe(true);
		expect(Object.isFrozen(overviewContent.hero.tokens)).toBe(true);
	});
});
