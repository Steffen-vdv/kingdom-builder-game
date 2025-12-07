import type { EffectDef } from '../effects';
import type { ResourceSourceLink, ResourceSourceMeta } from '../state';
import {
	cloneResourceSourceLink,
	mergeLinkCollections,
	normalizeLink,
	normalizeLinks,
	isPlainObject,
} from './link_helpers';
import type { ResourceSourceMetaPartial } from './types';

function mergeExtraData(
	baseExtra: Record<string, unknown> | undefined,
	incomingExtra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!incomingExtra || Object.keys(incomingExtra).length === 0) {
		return baseExtra ? { ...baseExtra } : undefined;
	}
	return { ...(baseExtra || {}), ...incomingExtra };
}

export function mergeMeta(
	baseMeta: ResourceSourceMeta,
	incomingMeta?: ResourceSourceMetaPartial | ResourceSourceMeta,
): void {
	if (!incomingMeta) {
		return;
	}
	const partialMeta = incomingMeta as ResourceSourceMetaPartial;
	if (partialMeta.resourceId) {
		baseMeta.resourceId = partialMeta.resourceId;
	}
	if (partialMeta.longevity) {
		if (
			baseMeta.longevity !== 'ongoing' ||
			partialMeta.longevity === 'ongoing'
		) {
			baseMeta.longevity = partialMeta.longevity;
		}
	}
	if (!baseMeta.kind && partialMeta.kind) {
		baseMeta.kind = partialMeta.kind;
	}
	if (!baseMeta.id && partialMeta.id) {
		baseMeta.id = partialMeta.id;
	}
	if (!baseMeta.detail && partialMeta.detail) {
		baseMeta.detail = partialMeta.detail;
	}
	if (!baseMeta.instance && partialMeta.instance) {
		baseMeta.instance = partialMeta.instance;
	}
	if (partialMeta.dependsOn) {
		const mergedDependencies = mergeLinkCollections(
			baseMeta.dependsOn,
			partialMeta.dependsOn,
		);
		if (mergedDependencies) {
			baseMeta.dependsOn = mergedDependencies;
		}
	}
	if (partialMeta.removal && !baseMeta.removal) {
		const removalClone = cloneResourceSourceLink(partialMeta.removal);
		if (removalClone) {
			baseMeta.removal = removalClone;
		}
	}
	if (partialMeta.effect) {
		const effectInfo: NonNullable<ResourceSourceMeta['effect']> = {
			...(baseMeta.effect || {}),
		};
		if (partialMeta.effect.type) {
			effectInfo.type = partialMeta.effect.type;
		}
		if (partialMeta.effect.method) {
			effectInfo.method = partialMeta.effect.method;
		}
		if (Object.keys(effectInfo).length > 0) {
			baseMeta.effect = effectInfo;
		}
	}
	if (partialMeta.extra) {
		const mergedExtra = mergeExtraData(baseMeta.extra, partialMeta.extra);
		if (mergedExtra) {
			baseMeta.extra = mergedExtra;
		}
	}
}

export function createResourceSourceKey(
	effectDefinition: EffectDef,
	resourceId: string,
): string {
	const typeSegment = effectDefinition.type ?? 'resource';
	const methodSegment = effectDefinition.method ?? 'change';
	const keySegments = [typeSegment, methodSegment, resourceId];
	return keySegments.join(':');
}

export function extractMetaFromEffect(
	effectDefinition: EffectDef,
	resourceId: string,
): ResourceSourceMetaPartial | undefined {
	const rawValue = effectDefinition.meta?.['resourceSource'];
	const rawMeta = isPlainObject(rawValue) ? rawValue : undefined;
	if (!rawMeta) {
		return undefined;
	}
	const partialMeta: ResourceSourceMetaPartial = {};
	if (typeof rawMeta['key'] === 'string' && rawMeta['key'].trim()) {
		partialMeta.resourceId = rawMeta['key'].trim();
	}
	if (
		rawMeta['longevity'] === 'ongoing' ||
		rawMeta['longevity'] === 'permanent'
	) {
		partialMeta.longevity = rawMeta['longevity'];
	}
	if (typeof rawMeta['kind'] === 'string' && rawMeta['kind'].trim()) {
		partialMeta.kind = rawMeta['kind'].trim();
	}
	if (typeof rawMeta['id'] === 'string' && rawMeta['id'].trim()) {
		partialMeta.id = rawMeta['id'].trim();
	}
	if (typeof rawMeta['detail'] === 'string' && rawMeta['detail'].trim()) {
		partialMeta.detail = rawMeta['detail'].trim();
	}
	if (rawMeta['instance'] !== undefined) {
		const instanceValue = rawMeta['instance'];
		if (instanceValue === null) {
			partialMeta.instance = 'null';
		} else if (typeof instanceValue === 'string') {
			const trimmedInstance = instanceValue.trim();
			if (trimmedInstance) {
				partialMeta.instance = trimmedInstance;
			}
		} else if (
			typeof instanceValue === 'number' ||
			typeof instanceValue === 'boolean'
		) {
			partialMeta.instance = String(instanceValue);
		} else {
			try {
				partialMeta.instance = JSON.stringify(instanceValue);
			} catch {
				partialMeta.instance = Object.prototype.toString.call(instanceValue);
			}
		}
	}
	const dependsOnLinks = normalizeLinks(rawMeta['dependsOn']);
	if (dependsOnLinks) {
		partialMeta.dependsOn = dependsOnLinks;
	}
	const removalLink = normalizeLink(rawMeta['removal']);
	if (removalLink) {
		partialMeta.removal = removalLink;
	}
	const extraEntries = Object.entries(rawMeta).filter(
		([key]) =>
			![
				'key',
				'longevity',
				'kind',
				'id',
				'detail',
				'instance',
				'dependsOn',
				'removal',
			].includes(key),
	);
	if (extraEntries.length > 0) {
		partialMeta.extra = Object.fromEntries(extraEntries);
	}
	const effectInfo: ResourceSourceMetaPartial['effect'] = {};
	if (effectDefinition.type) {
		effectInfo.type = effectDefinition.type;
	}
	if (effectDefinition.method) {
		effectInfo.method = effectDefinition.method;
	}
	if (Object.keys(effectInfo).length > 0) {
		partialMeta.effect = effectInfo;
	}
	if (!partialMeta.resourceId) {
		partialMeta.resourceId = createResourceSourceKey(effectDefinition, resourceId);
	}
	if (!partialMeta.longevity) {
		partialMeta.longevity = 'permanent';
	}
	return partialMeta;
}

export function cloneMeta(meta: ResourceSourceMeta): ResourceSourceMeta {
	const clonedMeta: ResourceSourceMeta = {
		resourceId: meta.resourceId,
		longevity: meta.longevity,
	};
	if (meta.kind) {
		clonedMeta.kind = meta.kind;
	}
	if (meta.id) {
		clonedMeta.id = meta.id;
	}
	if (meta.detail) {
		clonedMeta.detail = meta.detail;
	}
	if (meta.instance) {
		clonedMeta.instance = meta.instance;
	}
	if (meta.dependsOn) {
		clonedMeta.dependsOn = meta.dependsOn
			.map((dependency) => cloneResourceSourceLink(dependency))
			.filter((dependency): dependency is ResourceSourceLink =>
				Boolean(dependency),
			);
	}
	if (meta.removal) {
		const removalClone = cloneResourceSourceLink(meta.removal);
		if (removalClone) {
			clonedMeta.removal = removalClone;
		}
	}
	if (meta.effect) {
		clonedMeta.effect = { ...meta.effect };
	}
	if (meta.extra) {
		clonedMeta.extra = { ...meta.extra };
	}
	return clonedMeta;
}
