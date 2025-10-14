import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	ActionId,
	OVERVIEW_CONTENT,
	TRIGGER_INFO,
} from '@kingdom-builder/contents';
import { buildSessionMetadata } from '../../src/session/sessionMetadataBuilder';

describe('sessionMetadataBuilder', () => {
	it('clones registries and freezes the payload', () => {
		const { registries } = buildSessionMetadata();
		expect(Object.isFrozen(registries)).toBe(true);
		expect(Object.isFrozen(registries.actions)).toBe(true);
		const source = ACTIONS.get(ActionId.build);
		const cloned = registries.actions[ActionId.build];
		expect(cloned).toBeDefined();
		if (!source || !cloned) {
			throw new Error('Expected build action to be defined in registry');
		}
		expect(cloned).not.toBe(source);
		expect(cloned).toStrictEqual(source);
	});

	it('includes trigger metadata cloned from contents', () => {
		const { metadata } = buildSessionMetadata();
		const trigger = metadata.triggers?.onGainIncomeStep;
		expect(trigger).toBeDefined();
		expect(trigger?.icon).toBe(TRIGGER_INFO.onGainIncomeStep.icon);
		expect(trigger).not.toBe(TRIGGER_INFO.onGainIncomeStep);
	});

	it('exposes overview hero tokens without sharing references', () => {
		const { metadata } = buildSessionMetadata();
		const hero = metadata.overviewContent.hero;
		expect(hero.tokens.game).toBe(OVERVIEW_CONTENT.hero.tokens.game);
		expect(metadata.overviewContent).not.toBe(OVERVIEW_CONTENT);
		const tokens = metadata.overviewContent.hero.tokens;
		expect(Object.isFrozen(tokens)).toBe(true);
	});
});
