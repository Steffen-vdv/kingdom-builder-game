import { GAME_START } from '@kingdom-builder/contents';
import type {
	SessionDeveloperPresetPlan,
	SessionDeveloperPresetPlayerPlan,
} from '@kingdom-builder/protocol/session';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';

const PLAN_PLAYER_IDS = ['A', 'B'] as const;

const mergeNumericRecord = (
	base: Record<string, number> | undefined,
	override: Record<string, number> | undefined,
): Record<string, number> | undefined => {
	if (!base && !override) {
		return undefined;
	}
	const result: Record<string, number> = {};
	const assign = (source: Record<string, number> | undefined) => {
		if (!source) {
			return;
		}
		for (const [key, value] of Object.entries(source)) {
			if (typeof value === 'number' && Number.isFinite(value)) {
				result[key] = value;
			}
		}
	};
	assign(base);
	assign(override);
	return Object.keys(result).length > 0 ? result : undefined;
};

const mergePlayerStartConfig = (
	baseConfig: PlayerStartConfig | undefined,
	overrideConfig: PlayerStartConfig | undefined,
): PlayerStartConfig => {
	const merged: PlayerStartConfig = {};
	const resources = mergeNumericRecord(
		baseConfig?.resources,
		overrideConfig?.resources,
	);
	if (resources) {
		merged.resources = resources;
	}
	const stats = mergeNumericRecord(baseConfig?.stats, overrideConfig?.stats);
	if (stats) {
		merged.stats = stats;
	}
	const population = mergeNumericRecord(
		baseConfig?.population,
		overrideConfig?.population,
	);
	if (population) {
		merged.population = population;
	}
	const sourceLands =
		overrideConfig?.lands && overrideConfig.lands.length > 0
			? overrideConfig.lands
			: baseConfig?.lands;
	if (sourceLands && sourceLands.length > 0) {
		merged.lands = structuredClone(sourceLands);
	}
	return merged;
};

const resolveDeveloperStartConfig = () => {
	const basePlayer = structuredClone(GAME_START.player);
	const basePlayers = GAME_START.players
		? structuredClone(GAME_START.players)
		: undefined;
	const devOverride = GAME_START.modes?.dev;
	if (!devOverride) {
		return { player: basePlayer, players: basePlayers };
	}
	const player = mergePlayerStartConfig(basePlayer, devOverride.player);
	let players = basePlayers ? { ...basePlayers } : undefined;
	if (devOverride.players) {
		for (const [playerId, overrideConfig] of Object.entries(
			devOverride.players,
		)) {
			players = players ?? {};
			const baseConfig = players[playerId];
			players[playerId] = mergePlayerStartConfig(baseConfig, overrideConfig);
		}
	}
	return { player, players };
};

const createPlayerPlan = (
	playerId: (typeof PLAN_PLAYER_IDS)[number],
	config: PlayerStartConfig | undefined,
): SessionDeveloperPresetPlayerPlan | null => {
	if (!config) {
		return null;
	}
	const plan: SessionDeveloperPresetPlayerPlan = { playerId };
	const resourceEntries: Array<{ key: string; target: number }> = [];
	for (const [key, value] of Object.entries(config.resources ?? {})) {
		if (typeof value === 'number' && Number.isFinite(value)) {
			resourceEntries.push({ key, target: value });
		}
	}
	if (resourceEntries.length > 0) {
		plan.resources = resourceEntries;
	}
	const populationEntries: Array<{ role: string; count: number }> = [];
	for (const [role, count] of Object.entries(config.population ?? {})) {
		if (typeof count === 'number' && Number.isFinite(count)) {
			populationEntries.push({ role, count });
		}
	}
	if (populationEntries.length > 0) {
		plan.population = populationEntries;
	}
	const lands = config.lands ?? [];
	if (lands.length > 0) {
		plan.landCount = lands.length;
		const developmentIds: string[] = [];
		for (const land of lands) {
			if (!land?.developments) {
				continue;
			}
			for (const id of land.developments) {
				if (typeof id !== 'string' || id.length === 0) {
					continue;
				}
				if (!developmentIds.includes(id)) {
					developmentIds.push(id);
				}
			}
		}
		if (developmentIds.length > 0) {
			plan.developments = developmentIds;
		}
	}
	if (
		!plan.resources &&
		!plan.population &&
		plan.landCount === undefined &&
		!plan.developments
	) {
		return null;
	}
	return plan;
};

export const buildDeveloperPresetPlan = ():
	| SessionDeveloperPresetPlan
	| undefined => {
	if (!GAME_START.modes?.dev) {
		return undefined;
	}
	const resolved = resolveDeveloperStartConfig();
	const playerPlans: SessionDeveloperPresetPlayerPlan[] = [];
	for (const playerId of PLAN_PLAYER_IDS) {
		const config = mergePlayerStartConfig(
			resolved.player,
			resolved.players?.[playerId],
		);
		const plan = createPlayerPlan(playerId, config);
		if (plan) {
			playerPlans.push(plan);
		}
	}
	if (playerPlans.length === 0) {
		return undefined;
	}
	return { players: playerPlans };
};
