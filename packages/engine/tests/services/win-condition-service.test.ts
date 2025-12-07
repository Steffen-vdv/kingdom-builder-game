import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Resource as CResource, RULES } from '@kingdom-builder/contents';
import type { WinConditionDefinition } from '@kingdom-builder/protocol';
import { createTestEngine } from '../helpers';

function createRulesWithWinConditions(winConditions: WinConditionDefinition[]) {
	return {
		...RULES,
		winConditions,
	} as typeof RULES;
}

describe('WinConditionService', () => {
	it('awards a subject victory when self thresholds are met and ignores misses', () => {
		const resourceKey = Object.values(CResource)[0]!;
		const winCondition: WinConditionDefinition = {
			id: randomUUID(),
			trigger: {
				type: 'resource',
				resourceId: resourceKey,
				comparison: 'gte',
				value: 5,
				target: 'self',
			},
			result: { subject: 'victory', opponent: 'defeat' },
		};
		const engineContext = createTestEngine({
			rules: createRulesWithWinConditions([winCondition]),
			skipInitialSetup: true,
		});
		const subject = engineContext.game.players[0]!;
		const opponent = engineContext.game.players[1]!;
		subject.resourceValues[resourceKey] = 4;
		engineContext.services.winCondition.evaluateResourceChange(
			engineContext,
			subject,
			resourceKey,
		);
		expect(engineContext.game.conclusion).toBeUndefined();
		subject.resourceValues[resourceKey] = 5;
		engineContext.services.winCondition.evaluateResourceChange(
			engineContext,
			subject,
			resourceKey,
		);
		expect(engineContext.game.conclusion).toEqual({
			conditionId: winCondition.id,
			winnerId: subject.id,
			loserId: opponent.id,
			triggeredBy: subject.id,
		});
	});

	it('grants opponent victories when their thresholds pass and skips failures', () => {
		const resourceKey = Object.values(CResource)[0]!;
		const winCondition: WinConditionDefinition = {
			id: randomUUID(),
			trigger: {
				type: 'resource',
				resourceId: resourceKey,
				comparison: 'lte',
				value: 2,
				target: 'opponent',
			},
			result: { subject: 'defeat', opponent: 'victory' },
		};
		const engineContext = createTestEngine({
			rules: createRulesWithWinConditions([winCondition]),
			skipInitialSetup: true,
		});
		const subject = engineContext.game.players[0]!;
		const opponent = engineContext.game.players[1]!;
		opponent.resourceValues[resourceKey] = 5;
		engineContext.services.winCondition.evaluateResourceChange(
			engineContext,
			subject,
			resourceKey,
		);
		expect(engineContext.game.conclusion).toBeUndefined();
		opponent.resourceValues[resourceKey] = 1;
		engineContext.services.winCondition.evaluateResourceChange(
			engineContext,
			subject,
			resourceKey,
		);
		expect(engineContext.game.conclusion).toEqual({
			conditionId: winCondition.id,
			winnerId: opponent.id,
			loserId: subject.id,
			triggeredBy: subject.id,
		});
	});

	it('preserves existing conclusions without reapplying win conditions', () => {
		const resourceKey = Object.values(CResource)[0]!;
		const winCondition: WinConditionDefinition = {
			id: randomUUID(),
			trigger: {
				type: 'resource',
				resourceId: resourceKey,
				comparison: 'gte',
				value: 1,
				target: 'self',
			},
			result: { subject: 'victory', opponent: 'defeat' },
		};
		const engineContext = createTestEngine({
			rules: createRulesWithWinConditions([winCondition]),
			skipInitialSetup: true,
		});
		const subject = engineContext.game.players[0]!;
		const opponent = engineContext.game.players[1]!;
		const existingConclusion = {
			conditionId: randomUUID(),
			winnerId: opponent.id,
			loserId: subject.id,
			triggeredBy: opponent.id,
		};
		engineContext.game.conclusion = { ...existingConclusion };
		subject.resourceValues[resourceKey] = 10;
		engineContext.services.winCondition.evaluateResourceChange(
			engineContext,
			subject,
			resourceKey,
		);
		expect(engineContext.game.conclusion).toEqual(existingConclusion);
	});

	it('clones win conditions without sharing definition references', () => {
		const resourceKey = Object.values(CResource)[0]!;
		const winCondition: WinConditionDefinition = {
			id: randomUUID(),
			trigger: {
				type: 'resource',
				resourceId: resourceKey,
				comparison: 'gte',
				value: 3,
				target: 'self',
			},
			result: { subject: 'victory', opponent: 'defeat' },
		};
		const engineContext = createTestEngine({
			rules: createRulesWithWinConditions([winCondition]),
			skipInitialSetup: true,
		});
		const subject = engineContext.game.players[0]!;
		const opponent = engineContext.game.players[1]!;
		const clone = engineContext.services.winCondition.clone();
		(
			clone as unknown as { definitions: WinConditionDefinition[] }
		).definitions[0]!.trigger.value = 100;
		subject.resourceValues[resourceKey] = winCondition.trigger.value;
		engineContext.services.winCondition.evaluateResourceChange(
			engineContext,
			subject,
			resourceKey,
		);
		expect(engineContext.game.conclusion).toEqual({
			conditionId: winCondition.id,
			winnerId: subject.id,
			loserId: opponent.id,
			triggeredBy: subject.id,
		});
	});
});
