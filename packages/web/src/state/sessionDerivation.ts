import type {
	PlayerStartConfig,
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';

export const cloneValue = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	const serialized = JSON.stringify(value);
	const parsed: unknown = JSON.parse(serialized);
	return parsed as T;
};

const toPhaseConfig = (
	phase: SessionSnapshot['phases'][number],
): PhaseConfig => {
	const steps = Array.isArray(phase.steps)
		? phase.steps.map((step) => {
				const stepWithIcon = step as typeof step & { icon?: unknown };
				const icon =
					typeof stepWithIcon.icon === 'string' ? stepWithIcon.icon : undefined;
				return {
					id: step.id,
					...(step.title ? { title: step.title } : {}),
					...(step.triggers ? { triggers: [...step.triggers] } : {}),
					...(step.effects ? { effects: cloneValue(step.effects) } : {}),
					...(icon ? { icon } : {}),
				};
			})
		: [];
	const config: PhaseConfig = {
		id: phase.id,
		steps,
	};
	if (phase.action !== undefined) {
		config.action = phase.action;
	}
	if (phase.icon !== undefined) {
		config.icon = phase.icon;
	}
	if (phase.label !== undefined) {
		config.label = phase.label;
	}
	return config;
};

const buildLandStartConfig = (
	land: SessionSnapshot['game']['players'][number]['lands'][number],
): NonNullable<PlayerStartConfig['lands']>[number] => {
	const entry: NonNullable<PlayerStartConfig['lands']>[number] = {};
	if (land.developments.length > 0) {
		entry.developments = [...land.developments];
	}
	if (land.slotsMax !== undefined) {
		entry.slotsMax = land.slotsMax;
	}
	if (land.slotsUsed !== undefined) {
		entry.slotsUsed = land.slotsUsed;
	}
	if (land.tilled !== undefined) {
		entry.tilled = land.tilled;
	}
	if (land.upkeep && Object.keys(land.upkeep).length > 0) {
		entry.upkeep = { ...land.upkeep };
	}
	return entry;
};

const buildPlayerStartConfig = (
	player: SessionSnapshot['game']['players'][number],
): PlayerStartConfig | undefined => {
	const config: PlayerStartConfig = {};
	if (Object.keys(player.resources ?? {}).length > 0) {
		config.resources = { ...player.resources };
	}
	if (Object.keys(player.stats ?? {}).length > 0) {
		config.stats = { ...player.stats };
	}
	if (Object.keys(player.population ?? {}).length > 0) {
		config.population = { ...player.population };
	}
	if (Array.isArray(player.lands) && player.lands.length > 0) {
		config.lands = player.lands.map(buildLandStartConfig);
	}
	return Object.keys(config).length > 0 ? config : undefined;
};

export const derivePhaseConfig = (
	snapshot: SessionSnapshot,
	fallback: PhaseConfig[],
): PhaseConfig[] => {
	if (Array.isArray(snapshot.phases) && snapshot.phases.length > 0) {
		return snapshot.phases.map(toPhaseConfig);
	}
	return cloneValue(fallback);
};

export const deriveStartConfigFromSnapshot = (
	snapshot: SessionSnapshot,
	fallback: StartConfig,
): StartConfig => {
	const base = cloneValue(fallback);
	const [firstPlayer, ...otherPlayers] = snapshot.game.players;
	const baseConfig = firstPlayer
		? buildPlayerStartConfig(firstPlayer)
		: undefined;
	if (baseConfig) {
		base.player = baseConfig;
	}
	const overrides: Record<string, PlayerStartConfig> = {};
	for (const player of otherPlayers) {
		const startConfig = buildPlayerStartConfig(player);
		if (startConfig) {
			overrides[player.id] = startConfig;
		}
	}
	if (Object.keys(overrides).length > 0) {
		base.players = overrides;
	} else {
		delete base.players;
	}
	return base;
};

export const mergeRuleSet = (
	ruleSnapshot: SessionRuleSnapshot,
	fallback: RuleSet,
): RuleSet => {
	const rules = cloneValue(fallback);
	if (ruleSnapshot.tieredResourceKey) {
		rules.tieredResourceKey = ruleSnapshot.tieredResourceKey;
	}
	if (Array.isArray(ruleSnapshot.tierDefinitions)) {
		rules.tierDefinitions = cloneValue(ruleSnapshot.tierDefinitions);
	}
	if (Array.isArray(ruleSnapshot.winConditions)) {
		rules.winConditions = cloneValue(ruleSnapshot.winConditions);
	}
	return rules;
};
