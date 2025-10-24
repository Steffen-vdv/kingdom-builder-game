import { createEngine } from '../src/index.ts';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCE_V2_DEFINITION_REGISTRY,
} from '@kingdom-builder/contents';
import type {
	ActionConfig as ActionDef,
	BuildingConfig as BuildingDef,
	DevelopmentConfig as DevelopmentDef,
	PopulationConfig as PopulationDef,
	Registry,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { PhaseDef } from '../src/phases.ts';
import type { ResourceV2EngineRegistry } from '../src/resourceV2/registry.ts';
import type { EngineContext } from '../src/context.ts';
import type { PlayerState } from '../src/state/index.ts';

const BASE: {
	actions: Registry<ActionDef>;
	buildings: Registry<BuildingDef>;
	developments: Registry<DevelopmentDef>;
	populations: Registry<PopulationDef>;
	phases: PhaseDef[];
	start: StartConfig;
} = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
};

type EngineOverrides = Partial<typeof BASE> & {
	rules?: RuleSet;
	resourceV2Registry?: ResourceV2EngineRegistry;
};

export function createTestEngine(overrides: EngineOverrides = {}) {
	const { rules, resourceV2Registry, ...rest } = overrides;
	return createEngine({
		...BASE,
		...rest,
		rules: rules ?? RULES,
		resourceV2Registry,
	});
}

export function getResourceV2IdByDisplayName(displayName: string): string {
	const definition = RESOURCE_V2_DEFINITION_REGISTRY.values().find(
		(candidate) => candidate.display.name === displayName,
	);
	if (!definition) {
		throw new Error(
			`Unknown ResourceV2 definition with display name "${displayName}".`,
		);
	}
	return definition.id;
}

export function getAbsorptionResourceId(): string {
	return getResourceV2IdByDisplayName('Absorption');
}

export function setPlayerResourceV2Amount(
	context: EngineContext,
	player: PlayerState,
	resourceId: string,
	amount: number,
): void {
	const current = player.resourceV2.amounts[resourceId] ?? 0;
	const delta = amount - current;
	if (delta === 0) {
		return;
	}
	context.resourceV2.applyValueChange(context, player, resourceId, {
		delta,
		reconciliation: 'clamp',
	});
}
