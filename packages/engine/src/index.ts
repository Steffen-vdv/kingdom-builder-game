import {
	Resource,
	Phase,
	PopulationRole,
	Stat,
	GameState,
	Land,
	setResourceKeys,
	setStatKeys,
	setPhaseKeys,
	setPopulationRoleKeys,
} from './state';
import type {
	ResourceKey,
	PlayerState,
	StatKey,
	PopulationRoleId,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
} from './state';
import { Services, PassiveManager } from './services';
import type { CostBag, RuleSet } from './services';
import { EngineContext } from './context';
import {
	runEffects,
	EFFECTS,
	EFFECT_COST_COLLECTORS,
	registerCoreEffects,
} from './effects';
import type { EffectDef } from './effects';
import { collectTriggerEffects } from './triggers';
import { EVALUATORS, registerCoreEvaluators } from './evaluators';
import { runRequirement, registerCoreRequirements } from './requirements';
import { Registry } from './registry';
import { applyParamsToEffects } from './utils';
import { createAISystem, createTaxCollectorController } from './ai';
import { applyStatDelta, withStatSourceFrames } from './stat_sources';
import {
	validateGameConfig,
	type GameConfig,
	actionSchema,
	buildingSchema,
	developmentSchema,
	populationSchema,
	type PlayerStartConfig,
	type ActionConfig as ActionDef,
	type BuildingConfig as BuildingDef,
	type DevelopmentConfig as DevelopmentDef,
	type PopulationConfig as PopulationDef,
	type StartConfig,
} from './config/schema';
import type { PhaseDef } from './phases';
export { snapshotPlayer } from './log';
export type { PlayerSnapshot, ActionTrace } from './log';
export type {
	AttackLog,
	AttackEvaluationLog,
	AttackOnDamageLogEntry,
	AttackPlayerDiff,
	AttackPowerLog,
} from './effects/attack';

function isStatKey(key: string): key is StatKey {
	return key in Stat;
}

const START_STAT_SOURCE_META: StatSourceMeta = {
	key: 'start:setup',
	longevity: 'permanent',
	kind: 'start',
	detail: 'Initial setup',
};

function applyCostsWithPassives(
	actionId: string,
	base: CostBag,
	ctx: EngineContext,
): CostBag {
	const withDefault = { ...base };
	const definition = ctx.actions.get(actionId);
	const key = ctx.actionCostResource;
	if (key && withDefault[key] === undefined)
		withDefault[key] = definition.system
			? 0
			: ctx.services.rules.defaultActionAPCost;
	return ctx.passives.applyCostMods(actionId, withDefault, ctx);
}

export function getActionCosts<T extends string>(
	actionId: T,
	ctx: EngineContext,
	params?: ActionParams<T>,
): CostBag {
	const actionDefinition = ctx.actions.get(actionId);
	const base = { ...(actionDefinition.baseCosts || {}) };
	const resolved = applyParamsToEffects(actionDefinition.effects, params || {});
	for (const effect of resolved) {
		if (!effect.type || !effect.method) continue;
		const key = `${effect.type}:${effect.method}`;
		if (EFFECT_COST_COLLECTORS.has(key))
			EFFECT_COST_COLLECTORS.get(key)(effect, base, ctx);
	}
	return applyCostsWithPassives(actionDefinition.id, base, ctx);
}

export function getActionRequirements<T extends string>(
	actionId: T,
	ctx: EngineContext,
	_params?: ActionParams<T>,
): string[] {
	const actionDefinition = ctx.actions.get(actionId);
	const failures: string[] = [];
	for (const requirement of actionDefinition.requirements || []) {
		const ok = runRequirement(requirement, ctx);
		if (ok !== true) failures.push(String(ok));
	}
	return failures;
}

function canPay(costs: CostBag, player: PlayerState): true | string {
	for (const key of Object.keys(costs)) {
		const need = costs[key] ?? 0;
		const available = player.resources[key] ?? 0;
		if (available < need) {
			return `Insufficient ${key}: need ${need}, have ${available}`;
		}
	}
	return true;
}

function pay(costs: CostBag, player: PlayerState) {
	for (const key of Object.keys(costs)) {
		const amount = costs[key] ?? 0;
		player.resources[key] = (player.resources[key] || 0) - amount;
	}
}

type ActionParamMap = {
	develop: { id: string; landId: string };
	build: { id: string };
	demolish: { id: string };
	raise_pop: { role: PopulationRoleId };
	[key: string]: Record<string, unknown>;
};

export type ActionParams<T extends string> = T extends keyof ActionParamMap
	? ActionParamMap[T]
	: Record<string, unknown>;

export function performAction<T extends string>(
	actionId: T,
	ctx: EngineContext,
	params?: ActionParams<T>,
) {
	ctx.actionTraces = [];
	const actionDefinition = ctx.actions.get(actionId);
	if (actionDefinition.system && !ctx.activePlayer.actions.has(actionId))
		throw new Error(`Action ${actionId} is locked`);
	for (const requirement of actionDefinition.requirements || []) {
		const ok = runRequirement(requirement, ctx);
		if (ok !== true) throw new Error(String(ok));
	}
	const base = { ...(actionDefinition.baseCosts || {}) };
	const resolved = applyParamsToEffects(actionDefinition.effects, params || {});
	const attemptedBuildingAdds = resolved
		.filter((effect) => effect.type === 'building' && effect.method === 'add')
		.map((effect) => effect.params?.['id'])
		.filter((id): id is string => typeof id === 'string');
	for (const id of attemptedBuildingAdds) {
		if (ctx.activePlayer.buildings.has(id))
			throw new Error(`Building ${id} already built`);
	}
	for (const effect of resolved) {
		if (!effect.type || !effect.method) continue;
		const key = `${effect.type}:${effect.method}`;
		if (EFFECT_COST_COLLECTORS.has(key))
			EFFECT_COST_COLLECTORS.get(key)(effect, base, ctx);
	}
	const costs = applyCostsWithPassives(actionDefinition.id, base, ctx);
	const ok = canPay(costs, ctx.activePlayer);
	if (ok !== true) throw new Error(ok);
	pay(costs, ctx.activePlayer);

	withStatSourceFrames(
		ctx,
		(_effect, _ctx, statKey) => ({
			key: `action:${actionDefinition.id}:${statKey}`,
			kind: 'action',
			id: actionDefinition.id,
			detail: 'Resolution',
			longevity: 'permanent',
		}),
		() => {
			runEffects(resolved, ctx);
			ctx.passives.runResultMods(actionDefinition.id, ctx);
		},
	);
	const traces = ctx.actionTraces;
	ctx.actionTraces = [];
	return traces;
}

export interface AdvanceResult {
	phase: string;
	step: string;
	effects: EffectDef[];
	player: PlayerState;
}

export function advance(ctx: EngineContext): AdvanceResult {
	const phase = ctx.phases[ctx.game.phaseIndex]!;
	const step = phase.steps[ctx.game.stepIndex];
	const player = ctx.activePlayer;
	const effects: EffectDef[] = [];
	const phaseFrame = (
		_effect: EffectDef,
		_ctx: EngineContext,
		statKey: StatKey,
	) => {
		const partial = {
			key: `phase:${phase.id}:${step?.id ?? 'step'}:${statKey}`,
			kind: 'phase',
			id: phase.id,
			longevity: 'permanent' as const,
		} as const;
		const stepId = step?.id;
		return stepId ? { ...partial, detail: stepId } : partial;
	};

	const triggers = step?.triggers ?? [];
	if (triggers.length) {
		withStatSourceFrames(ctx, phaseFrame, () => {
			for (const trig of triggers) {
				const bundles = collectTriggerEffects(trig, ctx, player);
				for (const bundle of bundles) {
					withStatSourceFrames(ctx, bundle.frames, () =>
						runEffects(bundle.effects, ctx),
					);
					effects.push(...bundle.effects);
				}
			}
		});
	}
	if (step?.effects) {
		const stepEffects = step.effects;
		withStatSourceFrames(ctx, phaseFrame, () => {
			runEffects(stepEffects, ctx);
		});
		effects.push(...stepEffects);
	}

	if (step)
		withStatSourceFrames(ctx, phaseFrame, () =>
			ctx.passives.runResultMods(step.id, ctx),
		);

	ctx.game.stepIndex += 1;
	if (ctx.game.stepIndex >= phase.steps.length) {
		ctx.game.stepIndex = 0;
		ctx.game.phaseIndex += 1;
		if (ctx.game.phaseIndex >= ctx.phases.length) {
			ctx.game.phaseIndex = 0;
			if (ctx.game.currentPlayerIndex === ctx.game.players.length - 1) {
				ctx.game.currentPlayerIndex = 0;
				ctx.game.turn += 1;
			} else {
				ctx.game.currentPlayerIndex += 1;
			}
		}
	}

	const nextPhase = ctx.phases[ctx.game.phaseIndex]!;
	const nextStep = nextPhase.steps[ctx.game.stepIndex];
	ctx.game.currentPhase = nextPhase.id;
	ctx.game.currentStep = nextStep ? nextStep.id : '';

	return { phase: phase.id, step: step?.id || '', effects, player };
}

function applyPlayerStart(
	player: PlayerState,
	config: PlayerStartConfig,
	rules: RuleSet,
) {
	for (const [key, value] of Object.entries(config.resources || {}))
		player.resources[key] = value ?? 0;
	for (const [key, value] of Object.entries(config.stats || {})) {
		if (!isStatKey(key)) continue;
		const val = value ?? 0;
		const prev = player.stats[key] ?? 0;
		player.stats[key] = val;
		if (val !== 0) player.statsHistory[key] = true;
		const delta = val - prev;
		if (delta !== 0) applyStatDelta(player, key, delta, START_STAT_SOURCE_META);
	}
	for (const [key, value] of Object.entries(config.population || {}))
		player.population[key] = value ?? 0;
	if (config.lands)
		config.lands.forEach((landCfg, idx) => {
			const land = new Land(
				`${player.id}-L${idx + 1}`,
				landCfg.slotsMax ?? rules.slotsPerNewLand,
				landCfg.tilled ?? false,
			);
			if (landCfg.developments) land.developments.push(...landCfg.developments);
			land.slotsUsed = landCfg.slotsUsed ?? land.developments.length;
			if (landCfg.upkeep) land.upkeep = { ...landCfg.upkeep };
			if (landCfg.onPayUpkeepStep)
				land.onPayUpkeepStep = landCfg.onPayUpkeepStep.map((e) => ({ ...e }));
			if (landCfg.onGainIncomeStep)
				land.onGainIncomeStep = landCfg.onGainIncomeStep.map((e) => ({ ...e }));
			if (landCfg.onGainAPStep)
				land.onGainAPStep = landCfg.onGainAPStep.map((e) => ({ ...e }));
			player.lands.push(land);
		});
}

function diffPlayerStart(
	base: PlayerStartConfig,
	override: PlayerStartConfig | undefined,
): PlayerStartConfig {
	const diff: PlayerStartConfig = {};
	if (!override) return diff;
	for (const [key, value] of Object.entries(override.resources || {})) {
		const baseVal = base.resources?.[key] ?? 0;
		const delta = (value ?? 0) - baseVal;
		if (delta !== 0) {
			diff.resources = diff.resources || {};
			diff.resources[key] = delta;
		}
	}
	for (const [key, value] of Object.entries(override.stats || {})) {
		const baseVal = base.stats?.[key] ?? 0;
		const delta = (value ?? 0) - baseVal;
		if (delta !== 0) {
			diff.stats = diff.stats || {};
			diff.stats[key] = delta;
		}
	}
	return diff;
}

export function createEngine({
	actions,
	buildings,
	developments,
	populations,
	phases,
	start,
	rules,
	config,
}: {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseDef[];
	start: StartConfig;
	rules: RuleSet;
	config?: GameConfig;
}) {
	registerCoreEffects();
	registerCoreEvaluators();
	registerCoreRequirements();

	let startCfg = start;
	if (config) {
		const cfg = validateGameConfig(config);
		if (cfg.actions) {
			const registry = new Registry<ActionDef>(actionSchema);
			for (const action of cfg.actions) registry.add(action.id, action);
			actions = registry;
		}
		if (cfg.buildings) {
			const registry = new Registry<BuildingDef>(buildingSchema);
			for (const building of cfg.buildings) registry.add(building.id, building);
			buildings = registry;
		}
		if (cfg.developments) {
			const registry = new Registry<DevelopmentDef>(developmentSchema);
			for (const development of cfg.developments)
				registry.add(development.id, development);
			developments = registry;
		}
		if (cfg.populations) {
			const registry = new Registry<PopulationDef>(populationSchema);
			for (const population of cfg.populations)
				registry.add(population.id, population);
			populations = registry;
		}
		if (cfg.start) startCfg = cfg.start;
	}

	setResourceKeys(Object.keys(startCfg.player.resources || {}));
	setStatKeys(Object.keys(startCfg.player.stats || {}));
	setPhaseKeys(phases.map((p) => p.id));
	setPopulationRoleKeys(Object.keys(startCfg.player.population || {}));

	const services = new Services(rules, developments);
	const passives = new PassiveManager();
	const game = new GameState('Player', 'Opponent');

	let actionCostResource: ResourceKey = '' as ResourceKey;
	let intersect: string[] | null = null;
	for (const [, action] of actions.entries()) {
		if (action.system) continue;
		const keys = Object.keys(action.baseCosts || {});
		if (!keys.length) continue;
		intersect = intersect ? intersect.filter((k) => keys.includes(k)) : keys;
	}
	if (intersect && intersect.length)
		actionCostResource = intersect[0] as ResourceKey;

	const compA = diffPlayerStart(startCfg.player, startCfg.players?.['A']);
	const compB = diffPlayerStart(startCfg.player, startCfg.players?.['B']);
	const compensations = { A: compA, B: compB } as Record<
		'A' | 'B',
		PlayerStartConfig
	>;

	const ctx = new EngineContext(
		game,
		services,
		actions,
		buildings,
		developments,
		populations,
		passives,
		phases,
		actionCostResource,
		compensations,
	);
	const playerA = ctx.game.players[0]!;
	const playerB = ctx.game.players[1]!;

	const aiSystem = createAISystem({ performAction, advance });
	aiSystem.register(playerB.id, createTaxCollectorController(playerB.id));
	ctx.aiSystem = aiSystem;

	applyPlayerStart(playerA, startCfg.player, rules);
	applyPlayerStart(playerA, compA, rules);
	applyPlayerStart(playerB, startCfg.player, rules);
	applyPlayerStart(playerB, compB, rules);
	ctx.game.currentPlayerIndex = 0;
	ctx.game.currentPhase = phases[0]?.id || '';
	ctx.game.currentStep = phases[0]?.steps[0]?.id || '';

	return ctx;
}

export {
	Resource,
	Phase,
	PopulationRole,
	Stat,
	EFFECTS,
	EFFECT_COST_COLLECTORS,
	EVALUATORS,
	EngineContext,
	Services,
	PassiveManager,
};

export type {
	RuleSet,
	ResourceKey,
	StatKey,
	StatSourceMeta,
	StatSourceContribution,
	StatSourceLink,
};
export {
	registerCoreEffects,
	EffectRegistry,
	runEffects,
	EffectCostRegistry,
} from './effects';
export type { EffectHandler, EffectDef, EffectCostCollector } from './effects';
export { applyParamsToEffects } from './utils';
export { registerCoreEvaluators, EvaluatorRegistry } from './evaluators';
export type { EvaluatorHandler, EvaluatorDef } from './evaluators';
export { registerCoreRequirements, RequirementRegistry } from './requirements';
export type { RequirementHandler, RequirementDef } from './requirements';
export { validateGameConfig } from './config/schema';
export type { GameConfig } from './config/schema';
export { resolveAttack } from './effects/attack';
export { collectTriggerEffects } from './triggers';
