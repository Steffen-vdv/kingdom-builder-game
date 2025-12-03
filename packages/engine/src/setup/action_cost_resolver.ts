import { Resource } from '../state';
import type { ResourceKey } from '../state';
import type { RuntimeResourceCatalog } from '../resource-v2';
import { RESOURCE_KEY_BY_V2_ID } from '@kingdom-builder/contents/registries/resourceV2';
import type {
	Registry,
	ActionConfig as ActionDef,
} from '@kingdom-builder/protocol';

export interface ActionCostConfiguration {
	readonly resource: ResourceKey;
	readonly amount: number | null;
}

function toHyphenatedCamel(value: string): string {
	let result = '';
	for (let index = 0; index < value.length; index++) {
		const char = value[index] ?? '';
		const lower = char.toLowerCase();
		const isLetter = char.toLowerCase() !== char.toUpperCase();
		const isUpper = isLetter && char === char.toUpperCase();
		if (index > 0) {
			const previous = value[index - 1] ?? '';
			const previousLetter = previous.toLowerCase() !== previous.toUpperCase();
			const previousUpper =
				previousLetter && previous === previous.toUpperCase();
			if (isUpper && !previousUpper) {
				result += '-';
			} else if (!isUpper && previousUpper) {
				const prior = value[index - 2] ?? '';
				const priorLetter = prior.toLowerCase() !== prior.toUpperCase();
				const priorUpper = priorLetter && prior === prior.toUpperCase();
				if (priorUpper) {
					result += '-';
				}
			}
		}
		result += lower;
	}
	return result;
}

function toNormalizedSlug(value: string): string {
	const tokens = value
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((token) => toHyphenatedCamel(token));
	if (!tokens.length) {
		return '';
	}
	return tokens.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function toLabelAcronym(value: string | null | undefined): string {
	if (!value) {
		return '';
	}
	return value
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((segment) => segment[0]!.toLowerCase())
		.join('');
}

function extractResourceSlug(resourceId: string): string {
	const delimiterIndex = resourceId.lastIndexOf(':');
	if (delimiterIndex === -1) {
		return resourceId;
	}
	return resourceId.slice(delimiterIndex + 1);
}

function resolveLegacyResourceKey(
	resourceId: string,
	label: string | null | undefined,
): ResourceKey | null {
	// First, check if there's a direct mapping for known ResourceV2 IDs
	const directMapping =
		RESOURCE_KEY_BY_V2_ID[resourceId as keyof typeof RESOURCE_KEY_BY_V2_ID];
	if (directMapping) {
		return directMapping;
	}

	// Fall back to heuristic matching for unknown/synthetic resources
	const legacyKeys: ResourceKey[] = Object.values(Resource);
	const normalizedByKey = new Map<ResourceKey, string>();
	for (const key of legacyKeys) {
		normalizedByKey.set(key, toNormalizedSlug(key));
	}
	const slug = toNormalizedSlug(extractResourceSlug(resourceId));
	const labelSlug = toNormalizedSlug(label ?? '');
	const acronym = toLabelAcronym(label);
	for (const key of legacyKeys) {
		const normalizedKey = normalizedByKey.get(key);
		if (!normalizedKey) {
			continue;
		}
		if (slug && slug === normalizedKey) {
			return key;
		}
		if (labelSlug && labelSlug === normalizedKey) {
			return key;
		}
		if (acronym && key.toLowerCase() === acronym) {
			return key;
		}
	}
	return null;
}

function assertNoGlobalCostOverrides(
	actions: Registry<ActionDef>,
	resourceKey: ResourceKey,
): void {
	const violations: string[] = [];
	for (const [actionId, actionDefinition] of actions.entries()) {
		if (actionDefinition.system) {
			continue;
		}
		const baseCosts = actionDefinition.baseCosts || {};
		if (Object.prototype.hasOwnProperty.call(baseCosts, resourceKey)) {
			const configured = baseCosts[resourceKey];
			const label = actionDefinition.id ?? actionId;
			violations.push(
				configured === undefined ? label : `${label} (override: ${configured})`,
			);
		}
	}
	if (violations.length > 0) {
		throw new Error(
			`Global action cost resource ${resourceKey} forbids per-action overrides. ` +
				`Remove baseCosts entries from: ${violations.join(', ')}`,
		);
	}
}

export function determineCommonActionCostResource(
	actions: Registry<ActionDef>,
	resourceCatalog?: RuntimeResourceCatalog,
): ActionCostConfiguration {
	let globalResourceId: string | null = null;
	let globalCostAmount: number | null = null;
	let globalLabel: string | null = null;
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
			globalLabel = definition.label ?? null;
		}
	}
	if (globalResourceId && globalCostAmount !== null) {
		const legacyKey = resolveLegacyResourceKey(globalResourceId, globalLabel);
		if (!legacyKey) {
			throw new Error(
				`Unable to map global action cost resource ${globalResourceId} to a legacy resource key.`,
			);
		}
		assertNoGlobalCostOverrides(actions, legacyKey);
		return { resource: legacyKey, amount: globalCostAmount };
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
		const resource = intersection[0]!;
		return { resource, amount: null };
	}
	return { resource: '', amount: null };
}
