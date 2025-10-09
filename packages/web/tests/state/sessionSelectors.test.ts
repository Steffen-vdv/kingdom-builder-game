import { describe, expect, it } from 'vitest';
import { RESOURCES } from '@kingdom-builder/contents';
import type {
	EngineSessionSnapshot,
	PlayerStateSnapshot,
} from '@kingdom-builder/engine';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	selectSessionOptions,
	selectSessionPlayers,
	selectSessionView,
} from '../../src/state/sessionSelectors';

describe('sessionSelectors', () => {
	const factory = createContentFactory();
	const [primaryResource] = Object.keys(RESOURCES);
	const actionA = factory.action({ name: 'Action A' });
	const actionB = factory.action({ name: 'Action B' });
	const systemLocked = factory.action({ name: 'System Locked', system: true });
	const systemUnlocked = factory.action({
		name: 'System Unlocked',
		system: true,
	});
	Object.assign(actionA, { order: 2, category: 'basic', focus: 'economy' });
	factory.actions.add(actionA.id, {
		...factory.actions.get(actionA.id),
		order: 2,
		category: 'basic',
		focus: 'economy',
	});
	Object.assign(actionB, { order: 1 });
	factory.actions.add(actionB.id, {
		...factory.actions.get(actionB.id),
		order: 1,
	});
	Object.assign(systemLocked, { order: 3, category: 'basic' });
	factory.actions.add(systemLocked.id, {
		...factory.actions.get(systemLocked.id),
		order: 3,
		category: 'basic',
	});
	Object.assign(systemUnlocked, { order: 4, category: 'basic' });
	factory.actions.add(systemUnlocked.id, {
		...factory.actions.get(systemUnlocked.id),
		order: 4,
		category: 'basic',
	});
	const buildingA = factory.building({
		name: 'Building A',
		costs: { [primaryResource]: 1 },
	});
	const buildingB = factory.building({
		name: 'Building B',
		costs: { [primaryResource]: 2 },
	});
	const developmentA = factory.development({ name: 'Development A' });
	const developmentB = factory.development({ name: 'Development B' });
	factory.developments.add(developmentA.id, {
		...factory.developments.get(developmentA.id),
		order: 2,
	});
	factory.developments.add(developmentB.id, {
		...factory.developments.get(developmentB.id),
		order: 1,
	});
	const developmentSystem = factory.development({
		name: 'Development System',
		system: true,
	});
	const makePlayer = (
		id: string,
		overrides: Partial<PlayerStateSnapshot> = {},
	): PlayerStateSnapshot => ({
		id,
		name: `Player ${id}`,
		resources: { [primaryResource]: 5, ...(overrides.resources ?? {}) },
		stats: { ...(overrides.stats ?? {}) },
		statsHistory: { ...(overrides.statsHistory ?? {}) },
		population: { ...(overrides.population ?? {}) },
		lands: overrides.lands ?? [
			{
				id: `${id}-L1`,
				slotsMax: 3,
				slotsUsed: 1,
				tilled: true,
				developments: [],
			},
			{
				id: `${id}-L2`,
				slotsMax: 1,
				slotsUsed: 1,
				tilled: false,
				developments: [],
			},
		],
		buildings: overrides.buildings ?? [],
		actions: overrides.actions ?? [],
		statSources: overrides.statSources ?? {},
		skipPhases: overrides.skipPhases ?? {},
		skipSteps: overrides.skipSteps ?? {},
		passives: overrides.passives ?? [],
	});
	const players: PlayerStateSnapshot[] = [
		makePlayer('A', {
			buildings: [buildingA.id],
			actions: [actionA.id, systemUnlocked.id],
		}),
		makePlayer('B', {
			buildings: [buildingB.id],
			actions: [actionB.id],
		}),
	];
	const sessionState: EngineSessionSnapshot = {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: 'main',
			currentStep: 'step-0',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players,
			activePlayerId: 'A',
			opponentId: 'B',
		},
		phases: [],
		actionCostResource: primaryResource,
		recentResourceGains: [],
		compensations: {},
		rules: {
			tieredResourceKey: primaryResource,
			tierDefinitions: [],
			winConditions: [],
		},
		passiveRecords: {
			A: [],
			B: [],
		},
		metadata: { passiveEvaluationModifiers: {} },
	};
	const registries = {
		actions: factory.actions,
		buildings: factory.buildings,
		developments: factory.developments,
	};

	it('builds player view models with computed properties', () => {
		const selection = selectSessionPlayers(sessionState);
		expect(selection.list).toHaveLength(2);
		const first = selection.list[0]!;
		expect(first.id).toBe('A');
		expect(first.buildings.has(buildingA.id)).toBe(true);
		expect(first.actions.has(actionA.id)).toBe(true);
		expect(first.actions.has(systemUnlocked.id)).toBe(true);
		expect(first.lands[0]!.slotsFree).toBe(2);
		expect(selection.active?.id).toBe('A');
		expect(selection.opponent?.id).toBe('B');
	});

	it('creates action, building, and development option lists', () => {
		const options = selectSessionOptions(sessionState, registries);
		expect(options.actions.get(actionA.id)?.name).toBe(actionA.name);
		expect(options.actions.get(systemLocked.id)).toBeUndefined();
		expect(options.buildings.get(buildingA.id)?.name).toBe(buildingA.name);
		expect(options.developments.get(developmentSystem.id)).toBeUndefined();
		const developmentOrder = options.developmentList
			.filter((option) =>
				[developmentA.id, developmentB.id].includes(option.id),
			)
			.map((option) => option.id);
		expect(developmentOrder).toEqual([developmentB.id, developmentA.id]);
		const actionsForA = options.actionsByPlayer.get('A') ?? [];
		expect(actionsForA.map((option) => option.id)).toEqual([
			actionA.id,
			systemUnlocked.id,
		]);
		const actionsForB = options.actionsByPlayer.get('B') ?? [];
		expect(actionsForB.map((option) => option.id)).toEqual([actionB.id]);
	});

	it('supports custom sort helpers', () => {
		const options = selectSessionOptions(sessionState, registries, {
			sortActions: (left, right) => right.name.localeCompare(left.name),
			sortBuildings: (left, right) => right.name.localeCompare(left.name),
			sortDevelopments: (left, right) => right.name.localeCompare(left.name),
		});
		const sortedActionIds = options.actionList
			.filter((option) =>
				[systemUnlocked.id, actionA.id, actionB.id].includes(option.id),
			)
			.map((option) => option.id);
		expect(sortedActionIds).toEqual([
			systemUnlocked.id,
			actionB.id,
			actionA.id,
		]);
		const sortedBuildingIds = options.buildingList
			.filter((option) => [buildingA.id, buildingB.id].includes(option.id))
			.map((option) => option.id);
		expect(sortedBuildingIds).toEqual([buildingB.id, buildingA.id]);
		const sortedDevelopmentIds = options.developmentList
			.filter((option) =>
				[developmentA.id, developmentB.id].includes(option.id),
			)
			.map((option) => option.id);
		expect(sortedDevelopmentIds).toEqual([developmentB.id, developmentA.id]);
	});

	it('combines player and option selections', () => {
		const view = selectSessionView(sessionState, registries);
		expect(view.list.map((player) => player.id)).toEqual(['A', 'B']);
		expect(view.active?.id).toBe(sessionState.game.activePlayerId);
		expect(view.opponent?.id).toBe(sessionState.game.opponentId);
		expect(view.actions.get(actionB.id)?.name).toBe(actionB.name);
		expect(view.buildings.get(buildingA.id)?.name).toBe(buildingA.name);
		expect(view.developments.get(developmentSystem.id)).toBeUndefined();
		const activeOptions = view.actionsByPlayer.get('A') ?? [];
		expect(activeOptions.map((option) => option.id)).toEqual([
			actionA.id,
			systemUnlocked.id,
		]);
		const opponentOptions = view.actionsByPlayer.get('B') ?? [];
		expect(opponentOptions.map((option) => option.id)).toEqual([actionB.id]);
	});
});
