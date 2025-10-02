import { vi } from 'vitest';
import {
	PopulationRole,
	POPULATION_ROLES,
	type PopulationRoleId,
} from '@kingdom-builder/contents';

type ActionLike = {
	id: string;
	name: string;
	icon?: string;
	category?: string;
	order?: number;
	focus?: string;
	requirements?: unknown[];
	effects?: unknown[];
};

type PopulationLike = {
	id: string;
	icon?: string;
	upkeep?: Record<string, number>;
	onAssigned?: unknown[];
};

type RegistryLike<T extends { id: string }> = {
	map: Map<string, T>;
	get(id: string): T;
	entries(): [string, T][];
};

const compareRequirement = (left: unknown, right: unknown) => ({
	type: 'evaluator',
	method: 'compare',
	params: { left, operator: 'lt', right },
});

const populationEval = (role?: string) => ({
	type: 'population',
	params: role ? { role } : {},
});

const statEval = (key: string) => ({
	type: 'stat',
	params: { key },
});

function createRegistry<T extends { id: string }>(items: T[]): RegistryLike<T> {
	const map = new Map(items.map((item) => [item.id, item] as const));
	return {
		map,
		get(id: string) {
			const value = map.get(id);
			if (!value) throw new Error(`Unknown id: ${id}`);
			return value;
		},
		entries: () => Array.from(map.entries()),
	};
}

export interface ActionsPanelGameOptions {
	availableRoles?: PopulationRoleId[];
	showBuilding?: boolean;
}

export function createActionsPanelGame({
	availableRoles = [PopulationRole.Council, PopulationRole.Legion],
	showBuilding = false,
}: ActionsPanelGameOptions = {}) {
	const actions: ActionLike[] = [
		{
			id: 'raise_pop',
			name: 'Hire',
			icon: '👶',
			category: 'population',
			order: 1,
			focus: 'economy',
			requirements: [
				compareRequirement(populationEval(), statEval('maxPopulation')),
				compareRequirement(populationEval('$role'), 2),
			],
			effects: [
				{ type: 'population', method: 'add', params: { role: '$role' } },
			],
		},
		{
			id: 'basic_action',
			name: 'Survey',
			icon: '✨',
			category: 'basic',
			order: 2,
			focus: 'other',
			requirements: [],
			effects: [],
		},
	];
	if (showBuilding) {
		actions.push({
			id: 'build',
			name: 'Construct',
			icon: '🏛️',
			category: 'building',
			order: 3,
			focus: 'other',
			requirements: [],
			effects: [],
		});
	}

	const populations: PopulationLike[] = [
		...availableRoles.map((role) => ({
			id: role,
			icon: POPULATION_ROLES[role]?.icon ?? role,
			upkeep: { gold: 1 },
			onAssigned: [{}],
		})),
		{
			id: PopulationRole.Citizen,
			icon: POPULATION_ROLES[PopulationRole.Citizen]?.icon ?? '👤',
		},
	];

	const actionsRegistry = createRegistry(actions);
	const populationRegistry = createRegistry(populations);
	const buildingsRegistry = createRegistry(
		showBuilding ? [{ id: 'hall', name: 'Great Hall', icon: '🏰' }] : [],
	);
	const developmentsRegistry = createRegistry<{ id: string; name: string }>([]);

	const initialPopulation = populations.reduce<Record<string, number>>(
		(acc, population) => {
			acc[population.id] = 0;
			return acc;
		},
		{},
	);

	const player = {
		id: 'A',
		name: 'Player',
		resources: { ap: 3, gold: 10 },
		population: { ...initialPopulation },
		lands: [] as { id: string; slotsFree: number }[],
		buildings: new Set<string>(),
		actions: new Set(actions.map((action) => action.id)),
	};
	if (!showBuilding) {
		player.actions.delete('build');
	}

	const opponent = {
		id: 'B',
		name: 'Opponent',
		resources: { ap: 3, gold: 10 },
		population: { ...initialPopulation },
		lands: [] as { id: string; slotsFree: number }[],
		buildings: new Set<string>(),
		actions: new Set<string>(),
	};

	return {
		ctx: {
			actions: actionsRegistry,
			buildings: buildingsRegistry,
			developments: developmentsRegistry,
			populations: populationRegistry,
			game: {
				players: [player, opponent],
				currentPhase: 'main',
				currentStep: '',
			},
			activePlayer: player,
			actionCostResource: 'ap',
			phases: [{ id: 'main', action: true, steps: [] }],
		},
		log: [],
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		phaseSteps: [],
		setPhaseSteps: vi.fn(),
		phaseTimer: 0,
		mainApStart: 0,
		displayPhase: 'main',
		setDisplayPhase: vi.fn(),
		phaseHistories: {},
		tabsEnabled: true,
		actionCostResource: 'ap',
		handlePerform: vi.fn().mockResolvedValue(undefined),
		runUntilActionPhase: vi.fn(),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
		updateMainPhaseStep: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
	};
}
