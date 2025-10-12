import type { RuntimeBootstrapConfig } from '../startup/runtimeBootstrap';

let bootstrapConfig: RuntimeBootstrapConfig | null = null;

function cloneBootstrapConfig(
	config: RuntimeBootstrapConfig,
): RuntimeBootstrapConfig {
	const cloned: RuntimeBootstrapConfig = {
		primaryResourceId: config.primaryResourceId ?? null,
		resourceMetadata: Object.fromEntries(
			Object.entries(config.resourceMetadata).map(([key, descriptor]) => [
				key,
				{ ...descriptor },
			]),
		),
		phases: structuredClone(config.phases),
		start: structuredClone(config.start),
		rules: structuredClone(config.rules),
	};
	if (config.developerPreset) {
		const preset = config.developerPreset;
		const clonedPreset: NonNullable<RuntimeBootstrapConfig['developerPreset']> =
			{};
		if (preset.resources) {
			clonedPreset.resources = preset.resources.map((entry) => ({ ...entry }));
		}
		if (preset.population) {
			clonedPreset.population = preset.population.map((entry) => ({
				...entry,
			}));
		}
		if (preset.developments) {
			clonedPreset.developments = [...preset.developments];
		}
		if (preset.buildings) {
			clonedPreset.buildings = [...preset.buildings];
		}
		if (preset.landCount !== undefined) {
			clonedPreset.landCount = preset.landCount;
		}
		cloned.developerPreset = clonedPreset;
	}
	return cloned;
}

export function setSessionBootstrap(config: RuntimeBootstrapConfig): void {
	bootstrapConfig = cloneBootstrapConfig(config);
}

export function getSessionBootstrap(): RuntimeBootstrapConfig {
	if (!bootstrapConfig) {
		throw new Error(
			'Session bootstrap configuration has not been initialized.',
		);
	}
	return cloneBootstrapConfig(bootstrapConfig);
}

export function resetSessionBootstrapForTest(): void {
	bootstrapConfig = null;
}
