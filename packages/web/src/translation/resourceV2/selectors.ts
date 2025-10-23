import type {
	TranslationAssets,
	TranslationContext,
	TranslationResourceV2Registry,
	TranslationResourceV2Resource,
	TranslationResourceV2Parent,
	TranslationResourceV2GlobalCostLabel,
} from '../context';
import type {
	ResourceV2BoundsMetadata,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';

export type ResourceV2Carrier =
	| TranslationContext
	| TranslationResourceV2Registry
	| {
			resourceV2?: TranslationResourceV2Registry;
			assets?: TranslationAssets;
	  }
	| undefined;

function isRegistry(
	candidate: unknown,
): candidate is TranslationResourceV2Registry {
	if (!candidate || typeof candidate !== 'object') {
		return false;
	}
	const registryCandidate = candidate as TranslationResourceV2Registry;
	return typeof registryCandidate.listResources === 'function';
}

function readRegistry(
	source: ResourceV2Carrier,
): TranslationResourceV2Registry | undefined {
	if (!source) {
		return undefined;
	}
	if (isRegistry(source)) {
		return source;
	}
	if ('resourceV2' in source) {
		return source.resourceV2;
	}
	return undefined;
}

function readAssets(source: ResourceV2Carrier): TranslationAssets | undefined {
	if (!source || typeof source !== 'object') {
		return undefined;
	}
	if ('assets' in source) {
		return (source as { assets?: TranslationAssets }).assets;
	}
	return undefined;
}

function resolveResource(
	registry: TranslationResourceV2Registry | undefined,
	resourceId: string,
): TranslationResourceV2Resource | undefined {
	return registry?.getResource(resourceId);
}

function resolveParent(
	registry: TranslationResourceV2Registry | undefined,
	resourceId: string,
): TranslationResourceV2Parent | undefined {
	return registry?.getParentForResource(resourceId);
}

export function resourceV2DisplaysAsPercent(
	source: ResourceV2Carrier,
	resourceId: string | undefined,
): boolean {
	if (!resourceId) {
		return false;
	}
	const registry = readRegistry(source);
	const resource = resolveResource(registry, resourceId);
	if (resource?.display.displayAsPercent !== undefined) {
		return resource.display.displayAsPercent;
	}
	const parent = resolveParent(registry, resourceId);
	if (parent?.display.displayAsPercent !== undefined) {
		return parent.display.displayAsPercent;
	}
	const assets = readAssets(source);
	const assetEntry = assets?.resources?.[resourceId];
	if (assetEntry && typeof assetEntry.displayAsPercent === 'boolean') {
		return assetEntry.displayAsPercent;
	}
	return false;
}

export function selectResourceV2Bounds(
	source: ResourceV2Carrier,
	resourceId: string | undefined,
): ResourceV2BoundsMetadata | undefined {
	if (!resourceId) {
		return undefined;
	}
	const registry = readRegistry(source);
	const resource = resolveResource(registry, resourceId);
	if (resource?.bounds) {
		return resource.bounds;
	}
	return resolveParent(registry, resourceId)?.bounds;
}

export function selectResourceV2TierTrack(
	source: ResourceV2Carrier,
	resourceId: string | undefined,
): ResourceV2TierTrackDefinition | undefined {
	if (!resourceId) {
		return undefined;
	}
	const registry = readRegistry(source);
	const resource = resolveResource(registry, resourceId);
	if (resource?.tierTrack) {
		return resource.tierTrack;
	}
	return resolveParent(registry, resourceId)?.tierTrack;
}

export function selectResourceV2GlobalCostLabel(
	source: ResourceV2Carrier,
	resourceId: string | undefined,
): TranslationResourceV2GlobalCostLabel | undefined {
	if (!resourceId) {
		return undefined;
	}
	const registry = readRegistry(source);
	const assets = readAssets(source);
	const resource = resolveResource(registry, resourceId);
	const assetEntry = assets?.resources?.[resourceId];
	if (!resource) {
		if (!assetEntry) {
			return undefined;
		}
		const label = assetEntry.label ?? resourceId;
		const result: TranslationResourceV2GlobalCostLabel = {
			label,
		};
		if (assetEntry.icon !== undefined) {
			result.icon = assetEntry.icon;
		}
		return Object.freeze(result);
	}
	const parent = resolveParent(registry, resourceId);
	const label = resource.display.name ?? assetEntry?.label ?? resourceId;
	const result: TranslationResourceV2GlobalCostLabel = {
		label,
	};
	const icon =
		resource.display.icon ?? parent?.display.icon ?? assetEntry?.icon;
	if (icon !== undefined) {
		result.icon = icon;
	}
	const amount = resource.globalActionCost?.amount;
	if (amount !== undefined) {
		result.amount = amount;
	}
	return Object.freeze(result);
}
