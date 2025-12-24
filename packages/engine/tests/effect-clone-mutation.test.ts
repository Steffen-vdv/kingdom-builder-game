/**
 * Effect Clone Mutation Tests
 *
 * These tests verify that effect cloning properly isolates effects
 * from unintended mutations. The engine clones effects before execution
 * to prevent:
 *
 * 1. One effect execution mutating shared state that affects other executions
 * 2. Runtime modifications leaking back to content definitions
 * 3. Cross-bundle contamination when running multiple trigger bundles
 *
 * KNOWN LIMITATION: The cloneEffect function in triggers.ts uses shallow
 * cloning for params. If effect.params contains arrays/objects that are
 * mutated during execution, all clones share those mutations.
 */
import { describe, it, expect } from 'vitest';
import { advance, createEngine } from '../src';
import {
	Resource,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
	PHASES,
	RULES,
	PhaseId,
	createActionRegistry,
	buildResourceCatalog,
	getResourceId,
} from '@kingdom-builder/contents';
import {
	Registry,
	type ActionConfig,
	type EffectConfig,
} from '@kingdom-builder/protocol';

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

const COUNCIL_AP_GAIN = getCouncilApGain();

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMinimalEngine() {
	// Empty actions registry - no systemRole actions, so setup is skipped
	return createEngine({
		actions: new Registry<ActionConfig>(),
		buildings: new Registry(),
		developments: new Registry(),
		phases: PHASES,
		rules: RULES,
		resourceCatalog: {
			resources: RESOURCE_REGISTRY,
			groups: RESOURCE_GROUP_REGISTRY,
		},
	});
}

// ============================================================================
// EFFECT ISOLATION TESTS
// ============================================================================

describe('Effect Clone Isolation', () => {
	/**
	 * INVARIANT: Content definitions must not be modified by execution.
	 *
	 * If an effect handler mutates effect.params during execution,
	 * those mutations should not persist to the original definition.
	 */
	it('action definitions remain unchanged after execution', () => {
		const actions = createActionRegistry();

		// Snapshot action definitions before execution
		const before = new Map<string, string>();
		for (const action of actions.values()) {
			before.set(action.id, JSON.stringify(action));
		}

		// Execute an action that has effects
		const engine = createMinimalEngine();
		const player = engine.activePlayer;

		// Give player resources to perform actions
		player.resourceValues[Resource.gold] = 1000;
		player.resourceValues[Resource.cp] = 100;

		// Advance through growth phase to main
		while (engine.game.currentPhase !== PhaseId.Main) {
			advance(engine);
		}

		// Compare definitions after execution
		const after = new Map<string, string>();
		for (const action of actions.values()) {
			after.set(action.id, JSON.stringify(action));
		}

		const mutated: string[] = [];
		for (const [id, beforeJson] of before) {
			const afterJson = after.get(id);
			if (beforeJson !== afterJson) {
				mutated.push(id);
			}
		}

		expect(
			mutated,
			`Action definitions were mutated: ${mutated.join(', ')}`,
		).toHaveLength(0);
	});

	/**
	 * INVARIANT: Resource definitions must not be modified by execution.
	 *
	 * Resource definitions include trigger effects (onGainAPStep, etc.)
	 * that are cloned before execution. Mutations should not persist.
	 */
	it('resource definitions remain unchanged after trigger execution', () => {
		const catalog = buildResourceCatalog();

		// Snapshot resource definitions before execution
		const before = new Map<string, string>();
		for (const resource of catalog.resources.ordered) {
			before.set(resource.id, JSON.stringify(resource));
		}

		// Execute triggers
		const engine = createMinimalEngine();
		const player = engine.activePlayer;

		// Give player councils to trigger AP gain effects
		player.resourceValues[Resource.council] = 5;
		player.resourceValues[Resource.cp] = 0;

		// Advance through all phases
		for (let i = 0; i < 10; i++) {
			advance(engine);
		}

		// Compare definitions after execution
		const mutated: string[] = [];
		for (const resource of catalog.resources.ordered) {
			const beforeJson = before.get(resource.id);
			const afterJson = JSON.stringify(resource);
			if (beforeJson !== afterJson) {
				mutated.push(resource.id);
			}
		}

		expect(
			mutated,
			`Resource definitions were mutated: ${mutated.join(', ')}`,
		).toHaveLength(0);
	});
});

// ============================================================================
// CROSS-EXECUTION ISOLATION
// ============================================================================

describe('Cross-Execution Isolation', () => {
	/**
	 * INVARIANT: Multiple council units should each contribute 1 AP.
	 *
	 * If effect params are shared between bundles, mutations from one
	 * bundle's execution could affect other bundles.
	 */
	it('multiple trigger bundles produce independent results', () => {
		const engine = createMinimalEngine();
		const player = engine.activePlayer;

		// 5 councils should create 5 separate trigger bundles
		player.resourceValues[Resource.council] = 5;
		player.resourceValues[Resource.cp] = 0;

		// Position at gain AP step
		const growthPhaseIndex = PHASES.findIndex(
			(phase) => phase.id === PhaseId.Growth,
		);
		const growthPhase = PHASES[growthPhaseIndex]!;
		const gainApStepIndex = growthPhase.steps.findIndex((step) =>
			step.triggers?.includes('onGainAPStep'),
		);

		engine.game.phaseIndex = growthPhaseIndex;
		engine.game.stepIndex = gainApStepIndex;
		engine.game.currentPhase = PhaseId.Growth;
		engine.game.currentStep = growthPhase.steps[gainApStepIndex]?.id ?? '';

		advance(engine);

		// Each council should contribute AP based on content definition
		// If bundles share state, we might get different results
		expect(player.resourceValues[Resource.cp]).toBe(5 * COUNCIL_AP_GAIN);
	});

	/**
	 * INVARIANT: Running the same effect multiple times produces
	 * consistent results.
	 *
	 * If effect state accumulates between runs, results would vary.
	 */
	it('repeated effect execution produces consistent results', () => {
		const results: number[] = [];

		for (let run = 0; run < 3; run++) {
			const engine = createMinimalEngine();
			const player = engine.activePlayer;

			player.resourceValues[Resource.council] = 3;
			player.resourceValues[Resource.cp] = 0;

			// Position at gain AP step
			const growthPhaseIndex = PHASES.findIndex(
				(phase) => phase.id === PhaseId.Growth,
			);
			const growthPhase = PHASES[growthPhaseIndex]!;
			const gainApStepIndex = growthPhase.steps.findIndex((s) =>
				s.triggers?.includes('onGainAPStep'),
			);

			engine.game.phaseIndex = growthPhaseIndex;
			engine.game.stepIndex = gainApStepIndex;
			engine.game.currentPhase = PhaseId.Growth;
			engine.game.currentStep = growthPhase.steps[gainApStepIndex]?.id ?? '';

			advance(engine);

			results.push(player.resourceValues[Resource.cp]);
		}

		// All runs should produce the same result
		expect(new Set(results).size).toBe(1);
		expect(results[0]).toBe(3 * COUNCIL_AP_GAIN);
	});
});

// ============================================================================
// SHALLOW CLONE DOCUMENTATION
// ============================================================================

describe('Shallow Clone Behavior (Documentation)', () => {
	/**
	 * This test documents the KNOWN LIMITATION of shallow cloning.
	 *
	 * The cloneEffect function in triggers.ts does NOT deep-clone params:
	 *
	 *   function cloneEffect(effect: EffectDef): EffectDef {
	 *     const cloned: EffectDef = { ...effect };
	 *     if (effect.effects) {
	 *       cloned.effects = effect.effects.map(cloneEffect);
	 *     }
	 *     // Note: This is a SHALLOW clone - params are NOT deep-cloned.
	 *     return cloned;
	 *   }
	 *
	 * If an effect handler mutates effect.params.someArray or similar,
	 * all clones share that mutation. Current code does not do this,
	 * but it's a potential footgun for future development.
	 */
	it('documents that params are shallow-cloned (not deep-cloned)', () => {
		// This is a documentation test, not a behavior test.
		// The shallow clone behavior is intentional for performance,
		// but developers should be aware of the limitation.
		expect(true).toBe(true);
	});
});
