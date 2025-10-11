import type {
	PhaseConfig,
	StartConfig,
	RuleSet,
} from '@kingdom-builder/protocol';

export interface DeveloperPresetConfig {
	resourceTargets?: Record<string, number>;
	population?: Record<string, number>;
	buildingIds?: string[];
	landCount?: number;
	skipIfBuildingPresent?: string;
}

export interface PrimaryIconConfig {
	resourceKey?: string | null;
	icon?: string | null;
}

export interface RuntimeConfig {
	primaryIcon?: PrimaryIconConfig;
	developerPreset?: DeveloperPresetConfig;
	engine?: Partial<EngineBootstrapOptions>;
}

export interface EngineBootstrapOptions {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
}
