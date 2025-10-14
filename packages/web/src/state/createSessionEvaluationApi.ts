import {
	createEngine,
	getActionCosts as evaluateActionCosts,
	getActionRequirements as evaluateActionRequirements,
	getActionEffectGroups,
} from '@kingdom-builder/engine';
import type { PhaseConfig, StartConfig } from '@kingdom-builder/protocol';
import { RULES } from '@kingdom-builder/contents';
import type {
	SessionRequirementFailure,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from './sessionTypes';
import type { SessionEvaluationApi } from './GameContext.types';

const structuredCloneFallback = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

type EngineContext = ReturnType<typeof createEngine>;
type EngineLand = EngineContext['game']['players'][number]['lands'][number];

const cloneCostBag = (costs: Record<string, number | undefined>) => {
	const entries = Object.entries(costs).map(
		([key, amount]) => [key, typeof amount === 'number' ? amount : 0] as const,
	);
	return Object.fromEntries(entries) as Record<string, number>;
};

function buildStartConfig(
	snapshot: SessionSnapshot,
	registries: SessionRegistries,
): StartConfig {
	const resourceKeys = new Set<string>(Object.keys(registries.resources));
	const statKeys = new Set<string>();
	const populationKeys = new Set<string>();

	for (const player of snapshot.game.players) {
		for (const key of Object.keys(player.resources)) {
			resourceKeys.add(key);
		}
		for (const key of Object.keys(player.stats)) {
			statKeys.add(key);
		}
		for (const key of Object.keys(player.population)) {
			populationKeys.add(key);
		}
	}

	const playerConfig: StartConfig['player'] = {
		resources: Object.fromEntries(
			Array.from(resourceKeys).map((key) => [key, 0]),
		),
		stats: Object.fromEntries(Array.from(statKeys).map((key) => [key, 0])),
		population: Object.fromEntries(
			Array.from(populationKeys).map((key) => [key, 0]),
		),
		lands: [],
	};

	return { player: playerConfig } satisfies StartConfig;
}

function mapLands(
	lands: SessionSnapshot['game']['players'][number]['lands'],
): EngineLand[] {
	return lands.map((landSnapshot) => {
		const land: EngineLand = {
			id: landSnapshot.id,
			slotsMax: landSnapshot.slotsMax,
			slotsUsed: landSnapshot.slotsUsed,
			developments: [...landSnapshot.developments],
			tilled: landSnapshot.tilled,
			get slotsFree() {
				return this.slotsMax - this.slotsUsed;
			},
		};
		if (landSnapshot.upkeep) {
			land.upkeep = { ...landSnapshot.upkeep };
		}
		if (landSnapshot.onPayUpkeepStep) {
			land.onPayUpkeepStep = landSnapshot.onPayUpkeepStep.map((effect) =>
				structuredCloneFallback(effect),
			);
		}
		if (landSnapshot.onGainIncomeStep) {
			land.onGainIncomeStep = landSnapshot.onGainIncomeStep.map((effect) =>
				structuredCloneFallback(effect),
			);
		}
		if (landSnapshot.onGainAPStep) {
			land.onGainAPStep = landSnapshot.onGainAPStep.map((effect) =>
				structuredCloneFallback(effect),
			);
		}
		return land;
	});
}

function applyPassiveRecords(
	context: ReturnType<typeof createEngine>,
	snapshot: SessionSnapshot,
) {
	const passiveRecords = snapshot.passiveRecords;
	if (!passiveRecords) {
		return;
	}
	const players = context.game.players;
	const playerIndexById = new Map(
		players.map((player, index) => [player.id, index] as const),
	);
	const originalIndex = context.game.currentPlayerIndex;
	for (const [ownerId, records] of Object.entries(passiveRecords)) {
		const ownerIndex = playerIndexById.get(
			ownerId as (typeof players)[number]['id'],
		);
		if (ownerIndex === undefined) {
			continue;
		}
		context.game.currentPlayerIndex = ownerIndex;
		for (const record of records) {
			const payload = {
				id: record.id,
				...(record.name !== undefined ? { name: record.name } : {}),
				...(record.icon !== undefined ? { icon: record.icon } : {}),
				...(record.detail !== undefined ? { detail: record.detail } : {}),
				...(record.meta !== undefined ? { meta: record.meta } : {}),
				...(record.effects ? { effects: record.effects } : {}),
				...(record.onGrowthPhase
					? { onGrowthPhase: record.onGrowthPhase }
					: {}),
				...(record.onUpkeepPhase
					? { onUpkeepPhase: record.onUpkeepPhase }
					: {}),
				...(record.onBeforeAttacked
					? { onBeforeAttacked: record.onBeforeAttacked }
					: {}),
				...(record.onAttackResolved
					? { onAttackResolved: record.onAttackResolved }
					: {}),
				...(record.skip ? { skip: record.skip } : {}),
			} as const;
			const options = {
				...(record.detail !== undefined ? { detail: record.detail } : {}),
				...(record.meta !== undefined ? { meta: record.meta } : {}),
			} as const;
			context.passives.addPassive(payload, context, options);
		}
	}
	context.game.currentPlayerIndex = originalIndex;
}

function applySnapshotState(
	context: ReturnType<typeof createEngine>,
	snapshot: SessionSnapshot,
) {
	const playersById = new Map(
		context.game.players.map((player) => [player.id, player] as const),
	);

	for (const playerSnapshot of snapshot.game.players) {
		const player = playersById.get(playerSnapshot.id);
		if (!player) {
			continue;
		}
		player.name = playerSnapshot.name;
		for (const [resourceKey, amount] of Object.entries(
			playerSnapshot.resources,
		)) {
			player.resources[resourceKey] = amount ?? 0;
		}
		for (const [statKey, amount] of Object.entries(playerSnapshot.stats)) {
			player.stats[statKey] = amount ?? 0;
		}
		for (const [statKey, seen] of Object.entries(playerSnapshot.statsHistory)) {
			player.statsHistory[statKey] = Boolean(seen);
		}
		for (const [role, amount] of Object.entries(playerSnapshot.population)) {
			player.population[role] = amount ?? 0;
		}
		player.lands = mapLands(playerSnapshot.lands);
		player.buildings = new Set(playerSnapshot.buildings);
		player.actions = new Set(playerSnapshot.actions);
		player.statSources = structuredCloneFallback(playerSnapshot.statSources);
		player.skipPhases = structuredCloneFallback(playerSnapshot.skipPhases);
		player.skipSteps = structuredCloneFallback(playerSnapshot.skipSteps);
		if (Array.isArray(playerSnapshot.passives)) {
			(
				player as unknown as {
					passives?: typeof playerSnapshot.passives;
				}
			).passives = playerSnapshot.passives.map((passive) => ({
				...passive,
			}));
		}
	}

	context.recentResourceGains = (snapshot.recentResourceGains ?? []).map(
		(entry) => ({
			key: entry.key,
			amount: entry.amount,
		}),
	);
	context.compensations = structuredCloneFallback(snapshot.compensations ?? {});
	context.actionCostResource = snapshot.actionCostResource;

	context.game.turn = snapshot.game.turn;
	context.game.currentPhase = snapshot.game.currentPhase;
	context.game.currentStep = snapshot.game.currentStep;
	context.game.phaseIndex = snapshot.game.phaseIndex;
	context.game.stepIndex = snapshot.game.stepIndex;
	context.game.devMode = snapshot.game.devMode ?? false;
	if (snapshot.game.conclusion) {
		context.game.conclusion = structuredCloneFallback(snapshot.game.conclusion);
	} else {
		delete context.game.conclusion;
	}

	const activeIndex = snapshot.game.players.findIndex(
		(player) => player.id === snapshot.game.activePlayerId,
	);
	context.game.currentPlayerIndex = activeIndex >= 0 ? activeIndex : 0;
}

interface CreateSessionEvaluationOptions {
	snapshot: SessionSnapshot;
	registries: SessionRegistries;
}

function mapPhases(phases: SessionSnapshot['phases']): PhaseConfig[] {
	return phases.map((phase) => ({
		id: phase.id,
		action: phase.action,
		label: phase.label,
		icon: phase.icon,
		steps: phase.steps.map((step) => ({
			id: step.id,
			title: step.title,
			triggers: step.triggers,
			effects: step.effects,
		})),
	}));
}

export function createSessionEvaluationApi({
	snapshot,
	registries,
}: CreateSessionEvaluationOptions): SessionEvaluationApi {
	const rules = {
		...RULES,
		tieredResourceKey: snapshot.rules.tieredResourceKey,
		tierDefinitions: structuredCloneFallback(snapshot.rules.tierDefinitions),
		winConditions: structuredCloneFallback(snapshot.rules.winConditions ?? []),
	};
	const engineContext = createEngine({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases: mapPhases(snapshot.phases),
		start: buildStartConfig(snapshot, registries),
		rules,
		devMode: snapshot.game.devMode ?? false,
	});

	applyPassiveRecords(engineContext, snapshot);
	applySnapshotState(engineContext, snapshot);

	return {
		getActionCosts(actionId, params?: Record<string, unknown>) {
			const evaluated = evaluateActionCosts(
				actionId,
				engineContext,
				params as never,
			);
			return cloneCostBag(evaluated);
		},
		getActionRequirements(actionId, params?: Record<string, unknown>) {
			const failures = evaluateActionRequirements(
				actionId,
				engineContext,
				params as never,
			);
			return failures.map((failure) =>
				structuredCloneFallback(failure),
			) as SessionRequirementFailure[];
		},
		getActionOptions(actionId) {
			const groups = getActionEffectGroups(actionId, engineContext);
			return structuredCloneFallback(groups);
		},
	} satisfies SessionEvaluationApi;
}
