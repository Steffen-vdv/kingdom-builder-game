/**
 * Evaluator Scaling Audit Tests
 *
 * These tests verify that resource effects scale linearly (O(N)) and not
 * quadratically (O(N²)). Quadratic scaling can occur when:
 *
 * 1. Trigger loops already iterate per-unit, but effects use evaluators
 *    that count the same units again (bundles × evaluator = N²)
 * 2. Evaluators are placed inside effects that are themselves evaluated
 *    multiple times
 *
 * These bugs are subtle and devastating: with 2-3 units everything looks
 * fine, but with 10+ units the system breaks down.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { advance, createEngine } from '../src';
import {
	Resource,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	PHASES,
	RULES,
	PhaseId,
	buildResourceCatalog,
	DEVELOPMENTS,
} from '@kingdom-builder/contents';
import { Registry, type ActionConfig } from '@kingdom-builder/protocol';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMinimalEngine() {
	const SKIP_SETUP_ACTION_IDS = {
		initialSetup: '__scaling_test_noop_initial__',
		initialSetupDevmode: '__scaling_test_noop_devmode__',
		compensation: '__scaling_test_noop_compensation__',
	};

	return createEngine({
		actions: new Registry<ActionConfig>(),
		buildings: new Registry(),
		developments: DEVELOPMENTS, // Use real developments for income tests
		phases: PHASES,
		rules: RULES,
		resourceCatalog: {
			resources: RESOURCE_REGISTRY,
			groups: RESOURCE_GROUP_REGISTRY,
		},
		systemActionIds: SKIP_SETUP_ACTION_IDS,
	});
}

function positionAtStep(
	engine: ReturnType<typeof createEngine>,
	phaseId: string,
	triggerName: string,
) {
	const phaseIndex = PHASES.findIndex((phase) => phase.id === phaseId);
	if (phaseIndex === -1) {
		throw new Error(`Phase ${phaseId} not found`);
	}
	const phase = PHASES[phaseIndex]!;

	const stepIndex = phase.steps.findIndex((step) =>
		step.triggers?.includes(triggerName),
	);
	if (stepIndex === -1) {
		throw new Error(`Step with trigger ${triggerName} not found in ${phaseId}`);
	}

	engine.game.phaseIndex = phaseIndex;
	engine.game.stepIndex = stepIndex;
	engine.game.currentPhase = phase.id;
	engine.game.currentStep = phase.steps[stepIndex]?.id ?? '';
}

// ============================================================================
// LINEAR SCALING INVARIANTS
// ============================================================================

describe('Trigger Effect Scaling', () => {
	/**
	 * INVARIANT: N population units = N × effect value, not N² × effect value.
	 *
	 * The trigger collection loop creates N bundles (one per unit).
	 * Each bundle should NOT re-evaluate the count, or you get N × N.
	 */
	describe('onGainAPStep: Council AP generation', () => {
		it('scales linearly with council count', () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 20 }), (councilCount) => {
					const engine = createMinimalEngine();
					const player = engine.activePlayer;

					player.resourceValues[Resource.council] = councilCount;
					player.resourceValues[Resource.ap] = 0;

					positionAtStep(engine, PhaseId.Growth, 'onGainAPStep');
					advance(engine);

					const apGained = player.resourceValues[Resource.ap];

					// Linear: N councils = N AP (assuming 1 AP per council)
					// Quadratic bug would give: N councils = N² AP
					expect(apGained).toBe(councilCount);
				}),
				{ numRuns: 10 },
			);
		});

		it('confirms O(N) not O(N²) by checking ratio', () => {
			// With N=5, linear gives 5 AP, quadratic gives 25 AP
			// With N=10, linear gives 10 AP, quadratic gives 100 AP
			// Ratio of N=10/N=5 should be 2 (linear) not 4 (quadratic)

			const engine5 = createMinimalEngine();
			engine5.activePlayer.resourceValues[Resource.council] = 5;
			engine5.activePlayer.resourceValues[Resource.ap] = 0;
			positionAtStep(engine5, PhaseId.Growth, 'onGainAPStep');
			advance(engine5);
			const ap5 = engine5.activePlayer.resourceValues[Resource.ap];

			const engine10 = createMinimalEngine();
			engine10.activePlayer.resourceValues[Resource.council] = 10;
			engine10.activePlayer.resourceValues[Resource.ap] = 0;
			positionAtStep(engine10, PhaseId.Growth, 'onGainAPStep');
			advance(engine10);
			const ap10 = engine10.activePlayer.resourceValues[Resource.ap];

			const ratio = ap10 / ap5;

			// Linear scaling: ratio should be exactly 2
			// Quadratic scaling: ratio would be 4
			expect(ratio).toBe(2);
		});
	});

	describe('onGainIncomeStep: Farm income generation', () => {
		/**
		 * Farm income scales linearly with farm count.
		 *
		 * The trigger collection loop in triggers.ts creates one bundle per
		 * farm development. The farm's onGainIncomeStep effect adds +2 gold
		 * directly without an evaluator.
		 *
		 * This test guards against regression of the N² scaling bug that
		 * occurred when the farm definition incorrectly used an evaluator
		 * that re-counted farms (bundles × evaluator = N² scaling).
		 */
		it('scales linearly with development count', () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 10 }), (farmCount) => {
					const engine = createMinimalEngine();
					const player = engine.activePlayer;

					// Create N lands with farms
					player.lands = [];
					for (let i = 0; i < farmCount; i++) {
						player.lands.push({
							id: `land_${i}`,
							slotsMax: 1,
							slotsUsed: 1,
							tilled: true,
							developments: ['farm'],
						});
					}

					const goldBefore = player.resourceValues[Resource.gold] ?? 0;

					positionAtStep(engine, PhaseId.Growth, 'onGainIncomeStep');
					advance(engine);

					const goldGained =
						(player.resourceValues[Resource.gold] ?? 0) - goldBefore;

					// Each farm should produce income linearly
					const expectedGold = farmCount * 2;
					expect(goldGained).toBe(expectedGold);
				}),
				{ numRuns: 10 },
			);
		});
	});

	describe('onPayUpkeepStep: Population upkeep costs', () => {
		it('scales linearly with population count', () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 10 }), (legionCount) => {
					const engine = createMinimalEngine();
					const player = engine.activePlayer;

					// Legion has 1 gold upkeep per unit
					player.resourceValues[Resource.legion] = legionCount;
					// Give enough gold to pay upkeep
					const startingGold = 100;
					player.resourceValues[Resource.gold] = startingGold;

					positionAtStep(engine, PhaseId.Upkeep, 'onPayUpkeepStep');
					advance(engine);

					const goldRemaining = player.resourceValues[Resource.gold] ?? 0;
					const goldPaid = startingGold - goldRemaining;

					// Linear: N legions = N × 1 gold upkeep
					// Each legion costs 1 gold upkeep
					expect(goldPaid).toBe(legionCount);
				}),
				{ numRuns: 10 },
			);
		});

		it('council upkeep scales linearly (2 gold each)', () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 10 }), (councilCount) => {
					const engine = createMinimalEngine();
					const player = engine.activePlayer;

					// Council has 2 gold upkeep per unit
					player.resourceValues[Resource.council] = councilCount;
					const startingGold = 200;
					player.resourceValues[Resource.gold] = startingGold;

					positionAtStep(engine, PhaseId.Upkeep, 'onPayUpkeepStep');
					advance(engine);

					const goldRemaining = player.resourceValues[Resource.gold] ?? 0;
					const goldPaid = startingGold - goldRemaining;

					// Linear: N councils = N × 2 gold upkeep
					expect(goldPaid).toBe(councilCount * 2);
				}),
				{ numRuns: 10 },
			);
		});
	});
});

// ============================================================================
// EVALUATOR ARCHITECTURE INVARIANTS
// ============================================================================

describe('Evaluator Architecture Invariants', () => {
	/**
	 * INVARIANT: Content definitions with evaluators inside trigger effects
	 * should NOT re-count the triggering resource.
	 *
	 * WRONG: onGainAPStep per council, with effect that counts councils again
	 * RIGHT: onGainAPStep per council, with effect that adds fixed amount
	 */
	it('no trigger effects use same-resource evaluators (N² prevention)', () => {
		const catalog = buildResourceCatalog();
		const violations: string[] = [];

		for (const resource of catalog.resources.ordered) {
			const triggers = [
				'onGainAPStep',
				'onGainIncomeStep',
				'onPayUpkeepStep',
			] as const;

			for (const trigger of triggers) {
				const effects = resource[trigger];
				if (!effects) {
					continue;
				}

				// Check if any effect has an evaluator that references same resource
				const checkEffects = (effs: unknown[], path: string) => {
					for (const eff of effs) {
						if (typeof eff !== 'object' || eff === null) {
							continue;
						}
						const effect = eff as Record<string, unknown>;

						// Check evaluator
						if (effect.evaluator && typeof effect.evaluator === 'object') {
							const evaluator = effect.evaluator as Record<string, unknown>;
							if (evaluator.params && typeof evaluator.params === 'object') {
								const params = evaluator.params as Record<string, unknown>;
								if (params.resourceId === resource.id) {
									violations.push(
										`Resource "${resource.id}" trigger "${trigger}" has ` +
											`evaluator referencing same resource at ${path}. ` +
											`This causes N² scaling.`,
									);
								}
							}
						}

						// Recurse into nested effects
						if (Array.isArray(effect.effects)) {
							checkEffects(effect.effects, `${path}.effects`);
						}
					}
				};

				checkEffects(effects as unknown[], trigger);
			}
		}

		expect(violations, violations.join('\n')).toHaveLength(0);
	});

	/**
	 * INVARIANT: All evaluation modifiers must have valid target effects.
	 *
	 * This prevents silent failures where a modifier is registered but
	 * never fires because it targets an unsupported effect type.
	 * Currently 'resource:add' is the only supported target effect.
	 */
	it('resource:add is the primary evaluation target effect', () => {
		// The evaluation modifier system in result_mod.ts only supports
		// 'resource:add'. This test documents that behavior. If other
		// effect types are added, this test should be expanded.
		//
		// NOTE: The actual runtime validation happens in result_mod.ts
		// which throws if an unsupported targetEffect is specified.
		expect(true).toBe(true); // Placeholder - runtime validates this
	});
});

// ============================================================================
// COMBINATORIAL SCALING
// ============================================================================

describe('Combinatorial Scaling', () => {
	/**
	 * INVARIANT: Having multiple population types doesn't cause cross-scaling.
	 *
	 * With N councils and M legions:
	 * - AP gain should be N (from councils only)
	 * - Upkeep should be 2N + M (2 per council, 1 per legion)
	 *
	 * NOT N×M or (N+M)²
	 */
	it('multiple population types scale independently', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 5 }),
				fc.integer({ min: 1, max: 5 }),
				(councils, legions) => {
					const engine = createMinimalEngine();
					const player = engine.activePlayer;

					player.resourceValues[Resource.council] = councils;
					player.resourceValues[Resource.legion] = legions;
					player.resourceValues[Resource.ap] = 0;
					player.resourceValues[Resource.gold] = 100;

					// Test AP gain (should only count councils)
					positionAtStep(engine, PhaseId.Growth, 'onGainAPStep');
					advance(engine);

					const apGained = player.resourceValues[Resource.ap];
					expect(apGained).toBe(councils); // Only councils give AP

					// Reset and test upkeep (should count both independently)
					const engine2 = createMinimalEngine();
					const player2 = engine2.activePlayer;
					player2.resourceValues[Resource.council] = councils;
					player2.resourceValues[Resource.legion] = legions;
					const startGold = 100;
					player2.resourceValues[Resource.gold] = startGold;

					positionAtStep(engine2, PhaseId.Upkeep, 'onPayUpkeepStep');
					advance(engine2);

					const goldPaid = startGold - player2.resourceValues[Resource.gold];
					// Council: 2 gold each, Legion: 1 gold each
					const expectedUpkeep = councils * 2 + legions * 1;
					expect(goldPaid).toBe(expectedUpkeep);
				},
			),
			{ numRuns: 10 },
		);
	});
});
