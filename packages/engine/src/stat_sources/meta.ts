import type { EffectDef } from '../effects';
import type { StatSourceLink, StatSourceMeta } from '../state';
import {
	cloneStatSourceLink,
	mergeLinkCollections,
	normalizeLink,
	normalizeLinks,
	isPlainObject,
} from './link_helpers';
import type { StatSourceMetaPartial } from './types';

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
	baseMeta: StatSourceMeta,
	incomingMeta?: StatSourceMetaPartial | StatSourceMeta,
): void {
	if (!incomingMeta) {
		return;
	}
	const partialMeta = incomingMeta as StatSourceMetaPartial;
	if (partialMeta.key) {
		baseMeta.key = partialMeta.key;
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
		const removalClone = cloneStatSourceLink(partialMeta.removal);
		if (removalClone) {
			baseMeta.removal = removalClone;
		}
	}
	if (partialMeta.effect) {
		const effectInfo: NonNullable<StatSourceMeta['effect']> = {
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

export function createStatSourceKey(
	effectDefinition: EffectDef,
	resourceId: string,
): string {
	const typeSegment = effectDefinition.type ?? 'stat';
	const methodSegment = effectDefinition.method ?? 'change';
	const keySegments = [typeSegment, methodSegment, resourceId];
	return keySegments.join(':');
}

export function extractMetaFromEffect(
	effectDefinition: EffectDef,
	resourceId: string,
): StatSourceMetaPartial | undefined {
	const rawValue = effectDefinition.meta?.['statSource'];
	const rawMeta = isPlainObject(rawValue) ? rawValue : undefined;
	if (!rawMeta) {
		return undefined;
	}
	const partialMeta: StatSourceMetaPartial = {};
	if (typeof rawMeta['key'] === 'string' && rawMeta['key'].trim()) {
		partialMeta.key = rawMeta['key'].trim();
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
	const effectInfo: StatSourceMetaPartial['effect'] = {};
	if (effectDefinition.type) {
		effectInfo.type = effectDefinition.type;
	}
	if (effectDefinition.method) {
		effectInfo.method = effectDefinition.method;
	}
	if (Object.keys(effectInfo).length > 0) {
		partialMeta.effect = effectInfo;
	}
	if (!partialMeta.key) {
		partialMeta.key = createStatSourceKey(effectDefinition, resourceId);
	}
	if (!partialMeta.longevity) {
		partialMeta.longevity = 'permanent';
	}
	return partialMeta;
}

export function cloneMeta(meta: StatSourceMeta): StatSourceMeta {
	const clonedMeta: StatSourceMeta = {
		key: meta.key,
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
			.map((dependency) => cloneStatSourceLink(dependency))
			.filter((dependency): dependency is StatSourceLink =>
				Boolean(dependency),
			);
	}
	if (meta.removal) {
		const removalClone = cloneStatSourceLink(meta.removal);
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
