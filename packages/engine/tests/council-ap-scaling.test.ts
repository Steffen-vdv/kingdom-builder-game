/**
 * Test to verify council AP gain scales linearly with council count.
 *
 * This test guards against regression of a bug where council AP was calculated
 * as N² instead of N, due to redundant counting: the trigger collection loop
 * in triggers.ts iterates once per council unit to create bundles, and an
 * evaluator inside the effect was re-counting councils again.
 *
 * Expected: N councils = N AP (linear)
 * Bug: N councils = N² AP (quadratic due to double-counting)
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
} from '@kingdom-builder/contents';
import { Registry, type ActionConfig } from '@kingdom-builder/protocol';

function createRealContentEngine() {
	// Use the actual content definitions
	const actions = new Registry<ActionConfig>();

	// No-op system action IDs to skip initial setup
	const SKIP_SETUP_ACTION_IDS = {
		initialSetup: '__council_test_noop_initial__',
		initialSetupDevmode: '__council_test_noop_devmode__',
		compensation: '__council_test_noop_compensation__',
	};

	const engine = createEngine({
		actions,
		buildings: new Registry(),
		developments: new Registry(),
		phases: PHASES,
		rules: RULES,
		resourceCatalog: {
			resources: RESOURCE_REGISTRY,
			groups: RESOURCE_GROUP_REGISTRY,
		},
		systemActionIds: SKIP_SETUP_ACTION_IDS,
	});

	return engine;
}

function positionAtGainApStep(engine: ReturnType<typeof createEngine>) {
	// Find the growth phase and gain AP step indices
	const growthPhaseIndex = PHASES.findIndex(
		(phase) => phase.id === PhaseId.Growth,
	);
	const growthPhase = PHASES[growthPhaseIndex]!;
	const gainApStepIndex = growthPhase.steps.findIndex((step) =>
		step.triggers?.includes('onGainAPStep'),
	);

	// Position directly at the gain AP step
	// (without advancing through other phases)
	engine.game.phaseIndex = growthPhaseIndex;
	engine.game.stepIndex = gainApStepIndex;
	engine.game.currentPhase = PhaseId.Growth;
	engine.game.currentStep = growthPhase.steps[gainApStepIndex]?.id ?? '';
}

describe('council AP scaling', () => {
	it('grants AP linearly with council count (1 council = 1 AP)', () => {
		const engine = createRealContentEngine();
		const player = engine.activePlayer;

		// Set up: 1 council, 0 AP
		player.resourceValues[Resource.council] = 1;
		player.resourceValues[Resource.ap] = 0;

		positionAtGainApStep(engine);
		advance(engine);

		// 1 council should give exactly 1 AP
		expect(player.resourceValues[Resource.ap]).toBe(1);
	});

	it('grants AP linearly with council count (2 councils = 2 AP)', () => {
		const engine = createRealContentEngine();
		const player = engine.activePlayer;

		// Set up: 2 councils, 0 AP
		player.resourceValues[Resource.council] = 2;
		player.resourceValues[Resource.ap] = 0;

		positionAtGainApStep(engine);
		advance(engine);

		// 2 councils should give exactly 2 AP (not 4!)
		// Bug would cause: 2 bundles × 2 (from evaluator) = 4 AP
		expect(player.resourceValues[Resource.ap]).toBe(2);
	});

	it('grants AP linearly with council count (5 councils = 5 AP)', () => {
		const engine = createRealContentEngine();
		const player = engine.activePlayer;

		// Set up: 5 councils, 0 AP
		player.resourceValues[Resource.council] = 5;
		player.resourceValues[Resource.ap] = 0;

		positionAtGainApStep(engine);
		advance(engine);

		// 5 councils should give exactly 5 AP (not 25!)
		// Bug would cause: 5 bundles × 5 (from evaluator) = 25 AP
		expect(player.resourceValues[Resource.ap]).toBe(5);
	});

	it.each([
		{ councils: 1, expectedAp: 1 },
		{ councils: 2, expectedAp: 2 },
		{ councils: 3, expectedAp: 3 },
		{ councils: 4, expectedAp: 4 },
		{ councils: 10, expectedAp: 10 },
	])(
		'$councils councils grants $expectedAp AP (linear scaling)',
		({ councils, expectedAp }) => {
			const engine = createRealContentEngine();
			const player = engine.activePlayer;

			player.resourceValues[Resource.council] = councils;
			player.resourceValues[Resource.ap] = 0;

			positionAtGainApStep(engine);
			advance(engine);

			expect(player.resourceValues[Resource.ap]).toBe(expectedAp);
		},
	);
});
