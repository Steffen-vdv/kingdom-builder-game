import type { EffectDef } from '../effects';
import type { EngineContext } from '../context';
import type { PlayerState, ResourceKey, ResourceSourceMeta } from '../state';
import { appendDependencyLink, isPlainObject } from './link_helpers';
import {
	cloneMeta,
	createResourceSourceKey,
	extractMetaFromEffect,
	mergeMeta,
} from './meta';
import { RESOURCE_SOURCE_EPSILON } from './types';

export function resolveResourceSourceMeta(
	effectDefinition: EffectDef,
	context: EngineContext,
	resourceKey: ResourceKey,
): ResourceSourceMeta {
	const meta: ResourceSourceMeta = {
		sourceKey: createResourceSourceKey(effectDefinition, resourceKey),
		longevity: 'permanent',
	};
	const effectInfo: ResourceSourceMeta['effect'] = {};
	if (effectDefinition.type) {
		effectInfo.type = effectDefinition.type;
	}
	if (effectDefinition.method) {
		effectInfo.method = effectDefinition.method;
	}
	if (Object.keys(effectInfo).length > 0) {
		meta.effect = effectInfo;
	}
	for (const frame of context.resourceSourceStack) {
		const partialMeta = frame(effectDefinition, context, resourceKey);
		if (partialMeta) {
			mergeMeta(meta, partialMeta);
		}
	}
	const effectMeta = extractMetaFromEffect(effectDefinition, resourceKey);
	if (effectMeta) {
		mergeMeta(meta, effectMeta);
	}
	return meta;
}

export function applyResourceDelta(
	playerState: PlayerState,
	resourceKey: ResourceKey,
	delta: number,
	meta: ResourceSourceMeta,
): void {
	if (Math.abs(delta) < RESOURCE_SOURCE_EPSILON) {
		return;
	}
	const resourceId = resourceKey;
	const playerResourceSources = playerState.resourceSources;
	const sources =
		playerResourceSources[resourceId] ??
		(playerResourceSources[resourceId] = {});
	const existingEntry = sources[meta.sourceKey];
	const normalizedDelta = Math.abs(delta) < RESOURCE_SOURCE_EPSILON ? 0 : delta;
	if (!existingEntry) {
		if (normalizedDelta === 0) {
			return;
		}
		sources[meta.sourceKey] = {
			amount: normalizedDelta,
			meta: cloneMeta(meta),
		};
		return;
	}
	const nextAmount = existingEntry.amount + normalizedDelta;
	if (Math.abs(nextAmount) < RESOURCE_SOURCE_EPSILON) {
		delete sources[meta.sourceKey];
		return;
	}
	existingEntry.amount = nextAmount;
	mergeMeta(existingEntry.meta, meta);
}

export function recordEffectResourceDelta(
	effectDefinition: EffectDef,
	context: EngineContext,
	resourceKey: ResourceKey,
	delta: number,
): void {
	if (Math.abs(delta) < RESOURCE_SOURCE_EPSILON) {
		return;
	}
	const resourceId = resourceKey;
	const meta = resolveResourceSourceMeta(
		effectDefinition,
		context,
		resourceKey,
	);
	// Check for percent-based effects that depend on another resource
	const params = isPlainObject(effectDefinition.params)
		? effectDefinition.params
		: undefined;
	// Support both legacy percentResourceId and percentFromResource change pattern
	let percentSourceId =
		typeof params?.['percentResourceId'] === 'string'
			? params['percentResourceId'].trim()
			: '';
	// Also check for percentFromResource change type which uses sourceResourceId
	if (!percentSourceId && isPlainObject(params?.['change'])) {
		const change = params['change'];
		if (
			change['type'] === 'percentFromResource' &&
			typeof change['sourceResourceId'] === 'string'
		) {
			percentSourceId = change['sourceResourceId'].trim();
		}
	}
	if (percentSourceId) {
		appendDependencyLink(meta, {
			type: 'resource',
			id: percentSourceId,
		});
	}
	applyResourceDelta(context.activePlayer, resourceKey, delta, meta);
	context.activePlayer.resourceTouched[resourceId] = true;
}
