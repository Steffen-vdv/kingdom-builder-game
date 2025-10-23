import type { PlayerStartConfig, StartConfig } from '@kingdom-builder/protocol';

function mergeNumericRecord(
	base: Record<string, number> | undefined,
	override: Record<string, number> | undefined,
) {
	if (!base && !override) {
		return undefined;
	}
	const merged: Record<string, number> = { ...(base ?? {}) };
	if (override) {
		for (const [key, value] of Object.entries(override)) {
			merged[key] = value ?? 0;
		}
	}
	return merged;
}

function mergePlayerStartConfig(
	baseConfig: PlayerStartConfig | undefined,
	overrideConfig: PlayerStartConfig | undefined,
): PlayerStartConfig {
	if (!baseConfig && !overrideConfig) {
		return {};
	}
	const merged: PlayerStartConfig = {};
	const resources = mergeNumericRecord(
		baseConfig?.resources,
		overrideConfig?.resources,
	);
	if (resources) {
		merged.resources = resources;
	}
	const valuesV2 = mergeNumericRecord(
		baseConfig?.valuesV2,
		overrideConfig?.valuesV2,
	);
	if (valuesV2) {
		merged.valuesV2 = valuesV2;
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
	const lowerBounds = mergeNumericRecord(
		baseConfig?.resourceLowerBoundsV2,
		overrideConfig?.resourceLowerBoundsV2,
	);
	if (lowerBounds) {
		merged.resourceLowerBoundsV2 = lowerBounds;
	}
	const upperBounds = mergeNumericRecord(
		baseConfig?.resourceUpperBoundsV2,
		overrideConfig?.resourceUpperBoundsV2,
	);
	if (upperBounds) {
		merged.resourceUpperBoundsV2 = upperBounds;
	}
	if (overrideConfig?.lands) {
		merged.lands = structuredClone(overrideConfig.lands);
	} else if (baseConfig?.lands) {
		merged.lands = structuredClone(baseConfig.lands);
	}
	return merged;
}

export function resolveStartConfigForMode(
	baseConfig: StartConfig,
	devModeEnabled: boolean,
): StartConfig {
	const resolved = structuredClone(baseConfig);
	if (!devModeEnabled) {
		return resolved;
	}
	const devOverride = baseConfig.modes?.dev;
	if (!devOverride) {
		return resolved;
	}
	resolved.player = mergePlayerStartConfig(resolved.player, devOverride.player);
	if (devOverride.players) {
		resolved.players = resolved.players ?? {};
		for (const [playerId, overrideConfig] of Object.entries(
			devOverride.players,
		)) {
			const basePlayerConfig = resolved.players[playerId];
			resolved.players[playerId] = mergePlayerStartConfig(
				basePlayerConfig,
				overrideConfig,
			);
		}
	}
	return resolved;
}
