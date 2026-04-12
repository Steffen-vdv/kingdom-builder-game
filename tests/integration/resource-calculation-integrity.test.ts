/**
 * Cross-Package Resource Calculation Integrity Tests
 *
 * These tests verify that resource calculations remain correct as data flows
 * through the package pipeline: contents → engine → protocol → server.
 *
 * Specifically guards against:
 * 1. Percent modifiers being corrupted during serialization
 * 2. Linear scaling becoming quadratic through the stack
 * 3. Value transformations being applied incorrectly at boundaries
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { advance } from '@kingdom-builder/engine';
import {
	resolveActionEffects,
	type EffectConfig,
} from '@kingdom-builder/protocol';
import {
	PHASES,
	Resource,
	PhaseId,
	createActionRegistry,
	ActionId,
	DEVELOPMENTS,
	RESOURCE_REGISTRY,
	getResourceId,
} from '@kingdom-builder/contents';
import { createTestContext } from './fixtures';

// ============================================================================
// CONTENT-DERIVED VALUES
// ============================================================================

/**
 * Extract the amount from a resource:add effect.
 */
function extractAmountFromEffect(effect: EffectConfig): number {
	if (effect.type === 'resource' && effect.method === 'add') {
		const params = effect.params as { change?: { amount?: number } };
		return params?.change?.amount ?? 0;
	}
	return 0;
}

/**
 * Get per-council AP gain from content definition.
 */
function getCouncilApGain(): number {
	const councilId = getResourceId(Resource.council);
	const councilDef = RESOURCE_REGISTRY.byId[councilId];
	const effects = councilDef?.onGainAPStep ?? [];
	return effects.reduce((sum, eff) => sum + extractAmountFromEffect(eff), 0);
}

/**
 * Get per-farm gold income from content definition.
 */
function getFarmIncome(): number {
	const farmDef = DEVELOPMENTS.get('farm');
	const effects = farmDef?.onGainIncomeStep ?? [];
	return effects.reduce((sum, eff) => sum + extractAmountFromEffect(eff), 0);
}

const COUNCIL_AP_GAIN = getCouncilApGain();
const FARM_INCOME = getFarmIncome();

// ============================================================================
// PERCENT MODIFIER SERIALIZATION INTEGRITY
// ============================================================================

describe('Percent Modifier Serialization', () => {
	/**
	 * INVARIANT: Transfer percent modifiers survive JSON round-trip.
	 *
	 * Content defines percent as whole numbers (25 for 25%), builder converts
	 * to decimals (0.25). This decimal must survive JSON serialization when
	 * sent through protocol to server/client.
	 */
	it('transfer modifiers survive JSON serialization', () => {
		const actions = createActionRegistry();
		const plunderAction = actions.get(ActionId.plunder);
		// With tier migration, effects are in tiers['1'].effects
		const plunderEffects = plunderAction?.tiers?.['1']?.effects ?? [];

		if (plunderEffects.length === 0) {
			throw new Error('Plunder action should have effects');
		}

		// Find the transfer effect
		const transferEffect = plunderEffects.find(
			(effect) => effect.type === 'resource' && effect.method === 'transfer',
		);

		if (!transferEffect) {
			throw new Error('Plunder should have a transfer effect');
		}

		// Serialize and deserialize (simulates protocol transmission)
		const serialized = JSON.stringify(transferEffect);
		const deserialized = JSON.parse(serialized);

		// Extract modifiers from both
		const originalParams = transferEffect.params as {
			donor?: { change?: { modifiers?: number[] } };
			recipient?: { change?: { modifiers?: number[] } };
		};
		const deserializedParams = deserialized.params as {
			donor?: { change?: { modifiers?: number[] } };
			recipient?: { change?: { modifiers?: number[] } };
		};

		// Verify donor modifiers
		if (originalParams.donor?.change?.modifiers) {
			const originalMod = originalParams.donor.change.modifiers[0];
			const deserializedMod = deserializedParams.donor?.change?.modifiers?.[0];

			expect(deserializedMod).toBe(originalMod);
			// Modifiers should be decimals, not whole percentages
			if (originalMod !== undefined) {
				expect(Math.abs(originalMod)).toBeLessThanOrEqual(1);
			}
		}

		// Verify recipient modifiers
		if (originalParams.recipient?.change?.modifiers) {
			const originalMod = originalParams.recipient.change.modifiers[0];
			const deserializedMod =
				deserializedParams.recipient?.change?.modifiers?.[0];

			expect(deserializedMod).toBe(originalMod);
			if (originalMod !== undefined) {
				expect(Math.abs(originalMod)).toBeLessThanOrEqual(1);
			}
		}
	});

	/**
	 * INVARIANT: All action effects with percent changes use decimals.
	 *
	 * Scans all actions to ensure no whole percentages leaked into content.
	 */
	it('all action percent modifiers are decimals', () => {
		const actions = createActionRegistry();
		const violations: string[] = [];

		for (const action of actions.values()) {
			if (!action.effects) {
				continue;
			}

			const checkEffect = (effect: unknown, path: string) => {
				if (typeof effect !== 'object' || effect === null) {
					return;
				}

				const eff = effect as Record<string, unknown>;

				// Check for percent change modifiers
				const params = eff.params as Record<string, unknown> | undefined;
				if (params) {
					const checkChange = (change: unknown, changePath: string) => {
						if (typeof change !== 'object' || change === null) {
							return;
						}
						const c = change as Record<string, unknown>;
						if (c.type === 'percent' && Array.isArray(c.modifiers)) {
							for (const mod of c.modifiers) {
								if (typeof mod === 'number' && Math.abs(mod) > 1) {
									violations.push(
										`${path}.${changePath}: modifier ${mod} > 1 ` +
											`(should be decimal)`,
									);
								}
							}
						}
					};

					if (params.donor) {
						const donor = params.donor as Record<string, unknown>;
						checkChange(donor.change, 'donor.change');
					}
					if (params.recipient) {
						const recipient = params.recipient as Record<string, unknown>;
						checkChange(recipient.change, 'recipient.change');
					}
					if (params.change) {
						checkChange(params.change, 'change');
					}
				}

				// Recurse into nested effects
				if (Array.isArray(eff.effects)) {
					for (let i = 0; i < eff.effects.length; i++) {
						checkEffect(eff.effects[i], `${path}.effects[${i}]`);
					}
				}
			};

			for (let i = 0; i < action.effects.length; i++) {
				checkEffect(action.effects[i], `action:${action.id}.effects[${i}]`);
			}
		}

		expect(violations, violations.join('\n')).toHaveLength(0);
	});
});

// ============================================================================
// LINEAR SCALING THROUGH THE STACK
// ============================================================================

describe('Linear Scaling Through Stack', () => {
	/**
	 * INVARIANT: Council AP scales linearly through engine execution.
	 *
	 * Tests that N councils produce exactly N AP, verifying that the trigger
	 * loop + effect execution doesn't accidentally square the result.
	 */
	it('council AP scales linearly in engine', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10 }), (councilCount) => {
				const ctx = createTestContext();

				// Setup councils and reset AP
				ctx.activePlayer.resourceValues[Resource.council] = councilCount;
				ctx.activePlayer.resourceValues[Resource.cp] = 0;

				// Position at AP gain step (in Upkeep phase)
				const upkeepIndex = PHASES.findIndex(
					(phase) => phase.id === PhaseId.Upkeep,
				);
				const upkeepPhase = PHASES[upkeepIndex];
				if (!upkeepPhase) {
					throw new Error('Upkeep phase not found');
				}

				const apStepIndex = upkeepPhase.steps.findIndex((step) =>
					step.triggers?.includes('onGainAPStep'),
				);

				ctx.game.phaseIndex = upkeepIndex;
				ctx.game.stepIndex = apStepIndex;
				ctx.game.currentPhase = PhaseId.Upkeep;
				ctx.game.currentStep = upkeepPhase.steps[apStepIndex]?.id ?? '';

				// Advance through the step
				advance(ctx);

				// Should have gained exactly councilCount × AP_PER_COUNCIL (linear)
				expect(ctx.activePlayer.resourceValues[Resource.cp]).toBe(
					councilCount * COUNCIL_AP_GAIN,
				);
			}),
			{ numRuns: 10 },
		);
	});

	/**
	 * INVARIANT: Farm income scales linearly in engine.
	 *
	 * Tests that N farms produce exactly N × FARM_INCOME gold, verifying
	 * the fix for the N² scaling bug.
	 */
	it('farm income scales linearly in engine', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 10 }), (farmCount) => {
				const ctx = createTestContext();

				// Setup farms
				ctx.activePlayer.lands = [];
				for (let i = 0; i < farmCount; i++) {
					ctx.activePlayer.lands.push({
						id: `land_${i}`,
						slotsMax: 1,
						slotsUsed: 1,
						tilled: true,
						developments: ['farm'],
					});
				}

				const goldBefore = ctx.activePlayer.resourceValues[Resource.gold] ?? 0;

				// Position at income step
				const growthIndex = PHASES.findIndex(
					(phase) => phase.id === PhaseId.Growth,
				);
				const growthPhase = PHASES[growthIndex];
				if (!growthPhase) {
					throw new Error('Growth phase not found');
				}

				const incomeStepIndex = growthPhase.steps.findIndex((step) =>
					step.triggers?.includes('onGainIncomeStep'),
				);

				ctx.game.phaseIndex = growthIndex;
				ctx.game.stepIndex = incomeStepIndex;
				ctx.game.currentPhase = PhaseId.Growth;
				ctx.game.currentStep = growthPhase.steps[incomeStepIndex]?.id ?? '';

				advance(ctx);

				const goldGained =
					(ctx.activePlayer.resourceValues[Resource.gold] ?? 0) - goldBefore;

				// Should have gained exactly farmCount × FARM_INCOME gold (linear)
				expect(goldGained).toBe(farmCount * FARM_INCOME);
			}),
			{ numRuns: 10 },
		);
	});
});

// ============================================================================
// EFFECT RESOLUTION INTEGRITY
// ============================================================================

describe('Effect Resolution Integrity', () => {
	/**
	 * INVARIANT: Protocol effect resolution preserves numeric values.
	 *
	 * Tests that resolveActionEffects doesn't transform numeric values
	 * unexpectedly when processing effect definitions.
	 */
	it('resolveActionEffects preserves numeric params', () => {
		const testEffect = {
			type: 'resource' as const,
			method: 'add' as const,
			params: {
				resourceId: 'resource:core:gold',
				change: {
					type: 'amount' as const,
					amount: 42,
				},
			},
		};

		const testAction = {
			id: 'test-action',
			effects: [testEffect],
		};

		const result = resolveActionEffects(testAction, {});

		// resolveActionEffects returns { effects: [...], groups: [...], ... }
		expect(result.effects).toHaveLength(1);
		const resolvedEffect = result.effects[0];
		expect(resolvedEffect?.params).toBeDefined();
		const params = resolvedEffect!.params as {
			change?: { amount?: number };
		};
		expect(params.change?.amount).toBe(42);
	});

	/**
	 * INVARIANT: Effect params with percent modifiers are preserved.
	 */
	it('resolveActionEffects preserves percent modifiers', () => {
		const testEffect = {
			type: 'resource' as const,
			method: 'transfer' as const,
			params: {
				donor: {
					player: 'opponent' as const,
					resourceId: 'resource:core:gold',
					change: {
						type: 'percent' as const,
						modifiers: [-0.25],
					},
				},
				recipient: {
					player: 'active' as const,
					resourceId: 'resource:core:gold',
					change: {
						type: 'percent' as const,
						modifiers: [0.25],
					},
				},
			},
		};

		const testAction = {
			id: 'test-action',
			effects: [testEffect],
		};

		const result = resolveActionEffects(testAction, {});

		expect(result.effects).toHaveLength(1);
		const resolvedEffect = result.effects[0];
		const params = resolvedEffect?.params as {
			donor?: { change?: { modifiers?: number[] } };
			recipient?: { change?: { modifiers?: number[] } };
		};

		expect(params?.donor?.change?.modifiers?.[0]).toBe(-0.25);
		expect(params?.recipient?.change?.modifiers?.[0]).toBe(0.25);
	});
});
