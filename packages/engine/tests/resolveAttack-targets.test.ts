import { describe, it, expect, vi } from 'vitest';
import { resolveAttack } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource } from '../src/state/index.ts';
import { ResourceV2Id } from '@kingdom-builder/contents';

const ABSORPTION_ID = ResourceV2Id.Absorption;

function absorptionOptions(engineContext: ReturnType<typeof createTestEngine>) {
	const registry = engineContext.resourceV2.getRegistry();
	if (!registry) {
		throw new Error('ResourceV2 registry is not initialized.');
	}
	registry.getResource(ABSORPTION_ID);
	return { absorptionResourceId: ABSORPTION_ID };
}
import {
	attackTargetHandlers,
	type AttackTargetHandler,
} from '../src/effects/attack_target_handlers/index.ts';
import type { ResourceAttackTarget } from '../src/effects/attack.types.ts';

describe('resolveAttack target handlers', () => {
	it('delegates target application to registered handlers', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		const target: ResourceAttackTarget = {
			type: 'resource',
			key: Resource.castleHP,
		};

		const originalHandler = attackTargetHandlers.resource;
		const mutation = {
			before: defender.resources[target.key] ?? 0,
			after: 3,
		};
		const applySpy = vi.fn<typeof originalHandler.applyDamage>(
			(_target, damage) => {
				return {
					...mutation,
					after: Math.max(0, mutation.before - damage),
				};
			},
		);
		const buildSpy = vi.fn<typeof originalHandler.buildLog>(
			(resourceTarget, damage, _ctx, _defender, _meta, mut) => ({
				type: 'resource',
				key: resourceTarget.key,
				before: mut.before,
				damage,
				after: mut.after,
			}),
		);

		const stubHandler: AttackTargetHandler<
			ResourceAttackTarget,
			typeof mutation
		> = {
			getEvaluationModifierKey: vi.fn(
				() => target.key,
			) as typeof originalHandler.getEvaluationModifierKey,
			applyDamage: applySpy,
			buildLog: buildSpy,
		};

		attackTargetHandlers.resource = stubHandler;

		try {
			const result = resolveAttack(
				defender,
				2,
				engineContext,
				target,
				absorptionOptions(engineContext),
			);
			expect(applySpy).toHaveBeenCalledTimes(1);
			expect(buildSpy).toHaveBeenCalledTimes(1);
			const [applyTarget, appliedDamage] = applySpy.mock.calls[0]!;
			expect(applyTarget).toEqual(target);
			expect(appliedDamage).toBe(result.damageDealt);
			const buildResult = buildSpy.mock.results[0]!.value;
			expect(result.evaluation.target).toEqual(buildResult);
			expect(applySpy.mock.invocationCallOrder[0]).toBeLessThan(
				buildSpy.mock.invocationCallOrder[0]!,
			);
		} finally {
			attackTargetHandlers.resource = originalHandler;
		}
	});
});
