import {
	RESOURCES,
	Resource,
	RULES,
	STATS,
	POPULATION_ROLES,
} from '@kingdom-builder/contents';
import type {
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
} from '@kingdom-builder/protocol';

type ResourceDefinitionArray = ReadonlyArray<ResourceV2DefinitionConfig>;
type ResourceGroupDefinitionArray =
	ReadonlyArray<ResourceV2GroupDefinitionConfig>;

export function buildDefaultResourceDefinitions(): ResourceDefinitionArray {
	const definitions: ResourceV2DefinitionConfig[] = [];
	let order = 0;
	const pushDefinition = (definition: ResourceV2DefinitionConfig) => {
		definitions.push(definition);
	};
	for (const info of Object.values(RESOURCES)) {
		const display = {
			icon: info.icon ?? '',
			label: info.label ?? info.key,
			description: info.description ?? info.label ?? info.key,
			order: order++,
		} satisfies ResourceV2DefinitionConfig['display'];
		const definition: ResourceV2DefinitionConfig = {
			id: info.key,
			display,
		};
		if (info.key === Resource.ap) {
			definition.globalActionCost = {
				amount: RULES.defaultActionAPCost,
			};
		}
		pushDefinition(definition);
	}
	for (const info of Object.values(STATS)) {
		const display = {
			icon: info.icon ?? '',
			label: info.label ?? info.key,
			description: info.description ?? info.label ?? info.key,
			order: order++,
			...(info.displayAsPercent ? { percent: true } : {}),
		} satisfies ResourceV2DefinitionConfig['display'];
		const definition: ResourceV2DefinitionConfig = {
			id: info.key,
			display,
		};
		pushDefinition(definition);
	}
	for (const info of Object.values(POPULATION_ROLES)) {
		const display = {
			icon: info.icon ?? '',
			label: info.label ?? info.key,
			description: info.description ?? info.label ?? info.key,
			order: order++,
		} satisfies ResourceV2DefinitionConfig['display'];
		const definition: ResourceV2DefinitionConfig = {
			id: info.key,
			display,
		};
		pushDefinition(definition);
	}
	return definitions;
}

export function buildDefaultResourceGroups(): ResourceGroupDefinitionArray {
	return [];
}
