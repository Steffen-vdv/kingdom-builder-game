import type {
	SessionLandSnapshot,
	SessionPhaseDefinition,
	SessionPhaseStepDefinition,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type {
	EffectDef,
	PhaseConfig,
	RuleSet,
	StartConfig,
	PlayerStartConfig,
} from '@kingdom-builder/protocol';

function cloneEffectList(effects?: EffectDef[]): EffectDef[] | undefined {
	if (!effects) {
		return undefined;
	}
	return effects.map((effect) => ({ ...effect }));
}

function cloneDeep<T>(value: T): T {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
}

type StartLandConfig = NonNullable<PlayerStartConfig['lands']>[number];
type PhaseStepConfigEntry = PhaseConfig['steps'][number];

export function mapLandSnapshotToStartConfig(
	land: SessionLandSnapshot,
): StartLandConfig {
	const mapped: StartLandConfig = {
		developments: [...land.developments],
		slotsMax: land.slotsMax,
		slotsUsed: land.slotsUsed,
		tilled: land.tilled,
	};
	const { upkeep, onPayUpkeepStep, onGainIncomeStep, onGainAPStep } = land;
	if (upkeep) {
		mapped.upkeep = { ...upkeep };
	}
	const payUpkeep = cloneEffectList(onPayUpkeepStep);
	if (payUpkeep) {
		mapped.onPayUpkeepStep = payUpkeep;
	}
	const gainIncome = cloneEffectList(onGainIncomeStep);
	if (gainIncome) {
		mapped.onGainIncomeStep = gainIncome;
	}
	const gainActionPoints = cloneEffectList(onGainAPStep);
	if (gainActionPoints) {
		mapped.onGainAPStep = gainActionPoints;
	}
	return mapped;
}

function mapPlayerSnapshotToStartConfig(
	player: SessionPlayerStateSnapshot,
): PlayerStartConfig {
	const startConfig: PlayerStartConfig = {
		resources: { ...player.resources },
		stats: { ...player.stats },
		population: { ...player.population },
	};
	if (player.lands.length > 0) {
		startConfig.lands = player.lands.map(mapLandSnapshotToStartConfig);
	}
	return startConfig;
}

export function buildStartConfigFromSnapshot(
	snapshot: SessionSnapshot,
): StartConfig {
	const players: Record<string, PlayerStartConfig> = {};
	for (const player of snapshot.game.players) {
		players[player.id] = mapPlayerSnapshotToStartConfig(player);
	}
	return {
		player: {},
		players,
	} satisfies StartConfig;
}

function clonePhaseStepDefinition(
	step: SessionPhaseStepDefinition,
): PhaseStepConfigEntry {
	const cloned: PhaseStepConfigEntry = { id: step.id };
	if (step.title !== undefined) {
		cloned.title = step.title;
	}
	const effects = cloneEffectList(step.effects);
	if (effects) {
		cloned.effects = effects;
	}
	if (step.triggers && step.triggers.length > 0) {
		cloned.triggers = [...step.triggers];
	}
	const maybeIcon = (step as { icon?: unknown }).icon;
	if (typeof maybeIcon === 'string') {
		cloned.icon = maybeIcon;
	}
	return cloned;
}

function clonePhaseDefinitions(
	phases: SessionPhaseDefinition[],
): PhaseConfig[] {
	return phases.map((phase) => {
		const cloned: PhaseConfig = {
			id: phase.id,
			steps: phase.steps.map(clonePhaseStepDefinition),
		};
		if (phase.action !== undefined) {
			cloned.action = phase.action;
		}
		if (phase.label !== undefined) {
			cloned.label = phase.label;
		}
		if (phase.icon !== undefined) {
			cloned.icon = phase.icon;
		}
		return cloned;
	});
}

function clonePhaseConfig(phases: PhaseConfig[] | undefined): PhaseConfig[] {
	if (!phases || phases.length === 0) {
		return [];
	}
	return phases.map((phase) => ({
		id: phase.id,
		action: phase.action,
		icon: phase.icon,
		label: phase.label,
		steps: phase.steps.map((step) => {
			const clonedStep: PhaseStepConfigEntry = { id: step.id };
			if (step.title !== undefined) {
				clonedStep.title = step.title;
			}
			const effects = cloneEffectList(step.effects);
			if (effects) {
				clonedStep.effects = effects;
			}
			if (step.triggers && step.triggers.length > 0) {
				clonedStep.triggers = [...step.triggers];
			}
			if (step.icon !== undefined) {
				clonedStep.icon = step.icon;
			}
			return clonedStep;
		}),
	}));
}

export function resolvePhaseConfig(
	snapshotPhases: SessionPhaseDefinition[],
	runtimePhases: PhaseConfig[] | undefined,
): PhaseConfig[] {
	if (snapshotPhases.length > 0) {
		return clonePhaseDefinitions(snapshotPhases);
	}
	return clonePhaseConfig(runtimePhases);
}

export function mergeRuleSnapshot(
	ruleSnapshot: SessionRuleSnapshot,
	runtimeRules: RuleSet | undefined,
): RuleSet {
	const base: RuleSet = runtimeRules
		? cloneDeep(runtimeRules)
		: {
				defaultActionAPCost: 1,
				absorptionCapPct: 0,
				absorptionRounding: 'nearest' as const,
				tieredResourceKey: ruleSnapshot.tieredResourceKey,
				tierDefinitions: [] as RuleSet['tierDefinitions'],
				slotsPerNewLand: 0,
				maxSlotsPerLand: 0,
				basePopulationCap: 0,
				winConditions: [] as RuleSet['winConditions'],
			};
	base.tieredResourceKey = ruleSnapshot.tieredResourceKey;
	base.tierDefinitions = ruleSnapshot.tierDefinitions.map((definition) =>
		cloneDeep(definition),
	);
	base.winConditions = ruleSnapshot.winConditions.map((definition) =>
		cloneDeep(definition),
	);
	return base;
}

export function mergeStartConfigs(
	runtimeStart: StartConfig | undefined,
	snapshotStart: StartConfig,
): StartConfig {
	if (!runtimeStart) {
		return snapshotStart;
	}
	const playerConfig = {
		...(runtimeStart.player ?? {}),
		...(snapshotStart.player ?? {}),
	};
	const mergedPlayers = {
		...(runtimeStart.players ?? {}),
		...(snapshotStart.players ?? {}),
	};
	const merged: StartConfig = { player: playerConfig };
	if (Object.keys(mergedPlayers).length > 0) {
		merged.players = mergedPlayers;
	}
	if (runtimeStart.modes) {
		merged.modes = cloneDeep(runtimeStart.modes);
	}
	return merged;
}
