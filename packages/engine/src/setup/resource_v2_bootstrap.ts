import { PopulationRole, Resource, Stat, PlayerState } from '../state';
import type {
	PlayerId,
	PlayerStateOptions,
	PlayerStateResourceV2LegacyKeys,
	ResourceKey,
} from '../state';
import {
	createResourceV2StateBlueprint,
	type ResourceV2GlobalActionCostPointer,
	type ResourceV2Metadata,
} from '../resourceV2';
import type { ResourceV2Runtime } from '../resourceV2/runtime';
import type { ResourceV2State } from '../resourceV2/state';
import type { EngineContext } from '../context';
import type {
	PlayerStartConfig,
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
	StartConfig,
} from '@kingdom-builder/protocol';

interface ResourceV2BootstrapOptions {
	readonly definitions: ResourceV2DefinitionConfig[];
	readonly groups: ResourceV2GroupDefinitionConfig[];
	readonly startConfig: StartConfig;
}

interface ResourceV2BootstrapResult {
	readonly hasResourceV2: boolean;
	readonly metadata?: ResourceV2Metadata;
	readonly actionCostResource?: ResourceKey;
	readonly globalActionCost?: ResourceV2GlobalActionCostPointer;
	readonly playerFactory: (id: PlayerId, name: string) => PlayerState;
	readonly validatePlayerStart: (
		config: PlayerStartConfig | undefined,
		label: string,
	) => void;
	readonly attachRuntime: (context: EngineContext) => void;
}

function collectResourceV2StartValues(
	metadata: ResourceV2Metadata,
	config: PlayerStartConfig | undefined,
	label: string,
): Record<string, number> {
	const values: Record<string, number> = {};
	if (!config) {
		return values;
	}
	const checkEntries = (
		source: Record<string, number | undefined> | undefined,
	) => {
		if (!source) {
			return;
		}
		for (const [key, amount] of Object.entries(source)) {
			const definition = metadata.values.get(key);
			if (!definition) {
				throw new Error(
					`ResourceV2 definition missing for start config key "${key}" referenced in ${label}. Register the definition before creating the engine.`,
				);
			}
			if (definition.kind !== 'resource') {
				throw new Error(
					`Cannot initialise limited ResourceV2 parent "${key}" from ${label}. Configure child resources instead.`,
				);
			}
			values[key] = amount ?? 0;
		}
	};
	checkEntries(config.resources);
	checkEntries(config.stats);
	checkEntries(config.population);
	return values;
}

class EngineResourceV2Runtime implements ResourceV2Runtime {
	constructor(private readonly context: EngineContext) {}

	get state(): ResourceV2State {
		const activeState = this.context.game.active.resourceV2;
		if (!activeState) {
			throw new Error('Active player missing ResourceV2 state.');
		}
		return activeState;
	}

	hooks = {
		onValueChange: (ctx: EngineContext, resourceId: string) => {
			ctx.game.active.handleResourceV2ValueChange(resourceId);
		},
	};
}

export function prepareResourceV2Bootstrap({
	definitions,
	groups,
	startConfig,
}: ResourceV2BootstrapOptions): ResourceV2BootstrapResult {
	const hasResourceV2 = definitions.length > 0 || groups.length > 0;
	if (!hasResourceV2) {
		return {
			hasResourceV2: false,
			playerFactory: (id, name) => new PlayerState(id, name),
			validatePlayerStart: () => undefined,
			attachRuntime: () => undefined,
		} satisfies ResourceV2BootstrapResult;
	}
	const metadata = createResourceV2StateBlueprint({
		definitions,
		groups,
	});
	const baseValues = collectResourceV2StartValues(
		metadata,
		startConfig.player,
		'start.player',
	);
	if (startConfig.players) {
		for (const [playerId, playerConfig] of Object.entries(
			startConfig.players,
		)) {
			collectResourceV2StartValues(
				metadata,
				playerConfig,
				`start.players["${playerId}"]`,
			);
		}
	}
	const legacyKeys: PlayerStateResourceV2LegacyKeys = {
		resources: Object.values(Resource),
		stats: Object.values(Stat),
		population: Object.values(PopulationRole),
	};
	const playerOptionsById: Record<PlayerId, PlayerStateOptions> = {
		A: {
			resourceV2: {
				blueprint: metadata,
				initialValues: { ...baseValues },
				legacy: legacyKeys,
			},
		},
		B: {
			resourceV2: {
				blueprint: metadata,
				initialValues: { ...baseValues },
				legacy: legacyKeys,
			},
		},
	};
	const globalActionCost = metadata.globalActionCosts?.[0];
	return {
		hasResourceV2: true,
		metadata,
		actionCostResource: globalActionCost?.resourceId,
		globalActionCost,
		playerFactory: (id, name) =>
			new PlayerState(id, name, playerOptionsById[id] ?? {}),
		validatePlayerStart: (config, label) =>
			collectResourceV2StartValues(metadata, config, label),
		attachRuntime: (context: EngineContext) => {
			const resourceStates = new Map<PlayerId, ResourceV2State>();
			for (const player of context.game.players) {
				if (player.resourceV2) {
					resourceStates.set(player.id, player.resourceV2);
				}
			}
			context.resourceV2Metadata = metadata;
			context.resourceV2States = resourceStates;
			context.resourceV2 = new EngineResourceV2Runtime(context);
		},
	} satisfies ResourceV2BootstrapResult;
}

export type { ResourceV2BootstrapResult };
