import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	BROOM_ICON,
	MODIFIER_INFO,
	PHASES,
	PhaseId,
	POPULATION_INFO,
	RESOURCE_TRANSFER_ICON,
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

	it('provides population, upkeep, transfer, and modifier descriptors', () => {
		const { metadata } = buildSessionMetadata();
		const assets = metadata.assets ?? {};
		expect(assets.population).toMatchObject({
			icon: POPULATION_INFO.icon,
			label: POPULATION_INFO.label,
		});
		const upkeepPhase = PHASES.find((phase) => phase.id === PhaseId.Upkeep);
		expect(assets.upkeep).toMatchObject({
			icon: upkeepPhase?.icon ?? BROOM_ICON,
			label: upkeepPhase?.label ?? 'Upkeep',
		});
		expect(assets.transfer).toMatchObject({
			icon: RESOURCE_TRANSFER_ICON,
			label: 'Transfer',
		});
		expect(assets.modifiers).toEqual(MODIFIER_INFO);
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
