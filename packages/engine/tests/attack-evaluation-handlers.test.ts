import { describe, it, expect, vi } from 'vitest';
import { runEffects } from '../src/index.ts';
import { attackTargetHandlers } from '../src/effects/attack_handlers.ts';
import { Resource, Stat } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';

describe('attack:perform evaluation handlers', () => {
	it('delegates modifier keys for resource targets to handler', () => {
		const engineContext = createTestEngine();
		const attacker = engineContext.activePlayer;
		attacker.resourceValues[Stat.armyStrength] = 2;

		const target = { type: 'resource', key: Resource.castleHP } as const;
		const resourceHandler = attackTargetHandlers.resource;
		const originalGetKey = resourceHandler.getEvaluationModifierKey.bind(
			resourceHandler,
		) as typeof resourceHandler.getEvaluationModifierKey;
		const derivedKey = 'resource-eval-key';
		const getKeySpy = vi.fn(() => derivedKey) as typeof originalGetKey;
		resourceHandler.getEvaluationModifierKey = getKeySpy;
		const evaluationSpy = vi.spyOn(engineContext.passives, 'runEvaluationMods');

		try {
			runEffects(
				[
					{
						type: 'attack',
						method: 'perform',
						params: { target },
					},
				],
				engineContext,
			);

			expect(getKeySpy).toHaveBeenCalledWith(target);
			expect(evaluationSpy).toHaveBeenCalled();
			const modifiers = evaluationSpy.mock.calls[0]![2];
			expect(modifiers[0]!.key).toBe(derivedKey);
		} finally {
			resourceHandler.getEvaluationModifierKey = originalGetKey;
			evaluationSpy.mockRestore();
		}
	});

	it('delegates modifier keys for building targets to handler', () => {
		const content = createContentFactory();
		const workshop = content.building({});
		const engineContext = createTestEngine({ buildings: content.buildings });
		const attacker = engineContext.activePlayer;
		attacker.resourceValues[Stat.armyStrength] = 3;

		const target = { type: 'building', id: workshop.id } as const;
		const buildingHandler = attackTargetHandlers.building;
		const originalGetKey = buildingHandler.getEvaluationModifierKey.bind(
			buildingHandler,
		) as typeof buildingHandler.getEvaluationModifierKey;
		const derivedKey = 'building-eval-key';
		const getKeySpy = vi.fn(() => derivedKey) as typeof originalGetKey;
		buildingHandler.getEvaluationModifierKey = getKeySpy;
		const evaluationSpy = vi.spyOn(engineContext.passives, 'runEvaluationMods');

		try {
			runEffects(
				[
					{
						type: 'attack',
						method: 'perform',
						params: { target },
					},
				],
				engineContext,
			);

			expect(getKeySpy).toHaveBeenCalledWith(target);
			expect(evaluationSpy).toHaveBeenCalled();
			const modifiers = evaluationSpy.mock.calls[0]![2];
			expect(modifiers[0]!.key).toBe(derivedKey);
		} finally {
			buildingHandler.getEvaluationModifierKey = originalGetKey;
			evaluationSpy.mockRestore();
		}
	});
});
