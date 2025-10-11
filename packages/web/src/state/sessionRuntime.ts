import type {
	EffectDef,
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type {
	DeveloperPresetConfig,
	RuntimeConfig,
} from '../startup/runtimeConfig';

type PlayerSnapshot = SessionSnapshot['game']['players'][number];

function cloneEffects(
	effects: EffectDef[] | undefined,
): EffectDef[] | undefined {
	if (!effects) {
		return undefined;
	}
	return effects.map((effect) => {
		return structuredClone(effect);
	});
}

function cloneCostBag(
	costs: Record<string, number> | undefined,
): Record<string, number> | undefined {
	if (!costs) {
		return undefined;
	}
	const clone: Record<string, number> = {};
	for (const [key, value] of Object.entries(costs)) {
		clone[key] = Number(value);
	}
	return clone;
}

function toLandStartConfig(land: PlayerSnapshot['lands'][number]) {
	return {
		developments: [...land.developments],
		slotsMax: land.slotsMax,
		slotsUsed: land.slotsUsed,
		tilled: land.tilled,
		upkeep: cloneCostBag(land.upkeep),
		onPayUpkeepStep: cloneEffects(land.onPayUpkeepStep),
		onGainIncomeStep: cloneEffects(land.onGainIncomeStep),
		onGainAPStep: cloneEffects(land.onGainAPStep),
	};
}

function toPlayerStartConfig(player: PlayerSnapshot | undefined) {
	if (!player) {
		return {
			resources: {},
			stats: {},
			population: {},
			lands: [],
		};
	}
	return {
		resources: { ...player.resources },
		stats: { ...player.stats },
		population: { ...player.population },
		lands: player.lands.map(toLandStartConfig),
	};
}

function buildStartConfigFromSnapshot(snapshot: SessionSnapshot): StartConfig {
	const [primary, ...others] = snapshot.game.players;
	const start: StartConfig = {
		player: toPlayerStartConfig(primary),
	};
	if (others.length > 0) {
		const rest = Object.fromEntries(
			others.map((player) => [player.id, toPlayerStartConfig(player)]),
		);
		start.players = rest;
	}
	return start;
}

export function resolveStartConfig(
	snapshot: SessionSnapshot,
	runtimeConfig: RuntimeConfig,
): StartConfig {
	return runtimeConfig.startConfig ?? buildStartConfigFromSnapshot(snapshot);
}

function toPhaseConfig(
	definition: SessionSnapshot['phases'][number],
): PhaseConfig {
	const steps: PhaseConfig['steps'] = Array.isArray(definition.steps)
		? definition.steps.map((step) => {
				const mapped: PhaseConfig['steps'][number] = {
					id: step.id,
					title: step.title,
					triggers: step.triggers ? [...step.triggers] : undefined,
				};
				const effects = cloneEffects(step.effects);
				if (effects) {
					mapped.effects = effects;
				}
				return mapped;
			})
		: [];
	const phase: PhaseConfig = {
		id: definition.id,
		steps,
	};
	if (definition.action !== undefined) {
		phase.action = definition.action;
	}
	if (definition.label !== undefined) {
		phase.label = definition.label;
	}
	if (definition.icon !== undefined) {
		phase.icon = definition.icon;
	}
	return phase;
}

export function resolvePhases(
	snapshot: SessionSnapshot,
	runtimeConfig: RuntimeConfig,
): PhaseConfig[] {
	if (runtimeConfig.phases && runtimeConfig.phases.length > 0) {
		return runtimeConfig.phases;
	}
	if (snapshot.phases.length > 0) {
		return snapshot.phases.map(toPhaseConfig);
	}
	console.warn('Missing phase definitions. Using empty phase list.');
	return [];
}

export function resolveRuleSet(
	snapshot: SessionSnapshot,
	runtimeConfig: RuntimeConfig,
): RuleSet {
	if (runtimeConfig.ruleSet) {
		return runtimeConfig.ruleSet;
	}
	const baseRules = snapshot.rules;
	return {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: baseRules.tieredResourceKey,
		tierDefinitions: baseRules.tierDefinitions ?? [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: baseRules.winConditions ?? [],
	};
}

export function resolveDeveloperPreset(
	runtimeConfig: RuntimeConfig,
): DeveloperPresetConfig | undefined {
	return runtimeConfig.developerPreset;
}
