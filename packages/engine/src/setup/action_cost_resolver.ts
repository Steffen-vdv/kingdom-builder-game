import type { RuntimeResourceCatalog } from '../resource';
import type {
	Registry,
	ActionConfig as ActionDef,
} from '@kingdom-builder/protocol';

export interface ActionCostConfiguration {
	readonly resourceId: string;
	readonly amount: number | null;
}

function assertNoGlobalCostOverrides(
	actions: Registry<ActionDef>,
	resourceId: string,
	resourceCatalog: RuntimeResourceCatalog,
): void {
	const violations: string[] = [];
	for (const [actionId, actionDefinition] of actions.entries()) {
		if (actionDefinition.system) {
			continue;
		}
		const baseCosts = actionDefinition.baseCosts || {};
		for (const costKey of Object.keys(baseCosts)) {
			const costResourceId = resourceCatalog.resources.byId[costKey];
			if (costResourceId && costResourceId.id === resourceId) {
				const label = actionDefinition.id ?? actionId;
				violations.push(label);
				break;
			}
		}
	}
	if (violations.length > 0) {
		throw new Error(
			`Global action cost resource ${resourceId} forbids per-action overrides. ` +
				`Remove baseCosts entries for this resource from: ${violations.join(', ')}`,
		);
	}
}

export function determineCommonActionCostResource(
	actions: Registry<ActionDef>,
	resourceCatalog?: RuntimeResourceCatalog,
): ActionCostConfiguration {
	let globalResourceId: string | null = null;
	let globalCostAmount: number | null = null;
	if (resourceCatalog) {
		for (const definition of resourceCatalog.resources.ordered) {
			if (!definition.globalCost) {
				continue;
			}
			if (globalResourceId && globalResourceId !== definition.id) {
				throw new Error(
					`${definition.id} attempted to register as a second global action cost resource.`,
				);
			}
			globalResourceId = definition.id;
			globalCostAmount = definition.globalCost.amount;
		}
	}
	if (globalResourceId && globalCostAmount !== null && resourceCatalog) {
		assertNoGlobalCostOverrides(actions, globalResourceId, resourceCatalog);
		return { resourceId: globalResourceId, amount: globalCostAmount };
	}

	let intersection: string[] | null = null;
	for (const [, actionDefinition] of actions.entries()) {
		if (actionDefinition.system) {
			continue;
		}
		const costKeys = Object.keys(actionDefinition.baseCosts || {});
		if (!costKeys.length) {
			continue;
		}
		intersection = intersection
			? intersection.filter((key) => costKeys.includes(key))
			: costKeys;
	}
	if (intersection && intersection.length > 0) {
		const resourceId = intersection[0]!;
		return { resourceId, amount: null };
	}
	return { resourceId: '', amount: null };
}
