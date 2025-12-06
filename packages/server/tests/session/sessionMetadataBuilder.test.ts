import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	TRIGGER_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import { RESOURCE_V2_REGISTRY } from '@kingdom-builder/contents/registries/resourceV2';
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
	});

	it('copies stat formatting metadata', () => {
		const { metadata } = buildSessionMetadata();
		// Find a stat resource with displayAsPercent in the V2 registry
		const statWithPercent = RESOURCE_V2_REGISTRY.ordered.find(
			(resource) =>
				resource.id.startsWith('resource:core:') && resource.displayAsPercent,
		);
		expect(statWithPercent).toBeDefined();
		if (!statWithPercent) {
			throw new Error(
				'Expected stats with displayAsPercent in content definitions.',
			);
		}
		const statMetadata = metadata.stats?.[statWithPercent.id];
		expect(statMetadata).toBeDefined();
		expect(statMetadata?.displayAsPercent).toBe(
			statWithPercent.displayAsPercent,
		);
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
