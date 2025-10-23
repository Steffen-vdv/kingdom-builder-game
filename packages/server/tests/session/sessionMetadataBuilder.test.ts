import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	STATS,
	TRIGGER_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import { buildSessionMetadata } from '../../src/session/sessionMetadataBuilder.js';

describe('buildSessionMetadata', () => {
	it('clones registries into frozen payloads', () => {
		const { registries } = buildSessionMetadata();
		const [actionId, actionDef] = ACTIONS.entries()[0];
		const clonedAction = registries.actions[actionId];
		expect(clonedAction).toBeDefined();
		expect(clonedAction).not.toBe(actionDef);
		expect(clonedAction).toEqual(actionDef);
		expect(Object.isFrozen(clonedAction)).toBe(true);
		expect(Array.isArray(registries.resourceDefinitions)).toBe(true);
		expect(Array.isArray(registries.resourceGroups)).toBe(true);
		expect(Object.isFrozen(registries.resourceDefinitions)).toBe(true);
		expect(Object.isFrozen(registries.resourceGroups)).toBe(true);
	});

	it('copies stat formatting metadata', () => {
		const { metadata } = buildSessionMetadata();
		const [statId, statInfo] =
			Object.entries(STATS).find(([, info]) => info.addFormat) ?? [];
		expect(statId).toBeDefined();
		if (!statId || !statInfo) {
			throw new Error('Expected stats with formatting in content definitions.');
		}
		const statMetadata = metadata.stats?.[statId];
		expect(statMetadata).toBeDefined();
		expect((statMetadata as { format?: unknown })?.format).toEqual(
			statInfo.addFormat,
		);
		if (statInfo.displayAsPercent !== undefined) {
			expect(statMetadata?.displayAsPercent).toBe(statInfo.displayAsPercent);
		}
	});

	it('includes trigger metadata from content definitions', () => {
		const { metadata } = buildSessionMetadata();
		const [triggerId, triggerInfo] = Object.entries(TRIGGER_INFO)[0];
		const triggerMetadata = metadata.triggers?.[triggerId];
		expect(triggerMetadata).toBeDefined();
		expect(triggerMetadata?.icon).toBe(triggerInfo.icon);
		expect(triggerMetadata?.future).toBe(triggerInfo.future);
		expect(triggerMetadata?.past).toBe(triggerInfo.past);
	});

	it('clones overview content including hero tokens', () => {
		const { overviewContent } = buildSessionMetadata();
		const [tokenKey, tokenValue] =
			Object.entries(OVERVIEW_CONTENT.hero.tokens)[0] ?? [];
		expect(overviewContent).not.toBe(OVERVIEW_CONTENT);
		expect(Object.isFrozen(overviewContent)).toBe(true);
		if (tokenKey && tokenValue) {
			expect(overviewContent.hero.tokens[tokenKey]).toBe(tokenValue);
		} else {
			expect(Object.keys(overviewContent.hero.tokens).length).toBeGreaterThan(
				0,
			);
		}
	});
});
