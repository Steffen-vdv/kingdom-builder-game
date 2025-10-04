import type { EffectDef } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import type { PlayerState, StatKey, StatSourceMeta } from '../state';
import { appendDependencyLink, isPlainObject } from './link_helpers';
import {
	cloneMeta,
	createStatSourceKey,
	extractMetaFromEffect,
	mergeMeta,
} from './meta';
import { STAT_SOURCE_EPSILON } from './types';

export function resolveStatSourceMeta(
	effectDefinition: EffectDef,
	context: EngineContext,
	statKey: StatKey,
): StatSourceMeta {
	const meta: StatSourceMeta = {
		key: createStatSourceKey(effectDefinition, statKey),
		longevity: 'permanent',
	};
	const effectInfo: StatSourceMeta['effect'] = {};
	if (effectDefinition.type) {
		effectInfo.type = effectDefinition.type;
	}
	if (effectDefinition.method) {
		effectInfo.method = effectDefinition.method;
	}
	if (Object.keys(effectInfo).length > 0) {
		meta.effect = effectInfo;
	}
	for (const frame of context.statSourceStack) {
		const partialMeta = frame(effectDefinition, context, statKey);
		if (partialMeta) {
			mergeMeta(meta, partialMeta);
		}
	}
	const effectMeta = extractMetaFromEffect(effectDefinition, statKey);
	if (effectMeta) {
		mergeMeta(meta, effectMeta);
	}
	return meta;
}

export function applyStatDelta(
	playerState: PlayerState,
	statKey: StatKey,
	delta: number,
	meta: StatSourceMeta,
): void {
	if (Math.abs(delta) < STAT_SOURCE_EPSILON) {
		return;
	}
	const playerStatSources = playerState.statSources;
	const sources =
		playerStatSources[statKey] ?? (playerStatSources[statKey] = {});
	const existingEntry = sources[meta.key];
	const normalizedDelta = Math.abs(delta) < STAT_SOURCE_EPSILON ? 0 : delta;
	if (!existingEntry) {
		if (normalizedDelta === 0) {
			return;
		}
		sources[meta.key] = {
			amount: normalizedDelta,
			meta: cloneMeta(meta),
		};
		return;
	}
	const nextAmount = existingEntry.amount + normalizedDelta;
	if (Math.abs(nextAmount) < STAT_SOURCE_EPSILON) {
		delete sources[meta.key];
		return;
	}
	existingEntry.amount = nextAmount;
	mergeMeta(existingEntry.meta, meta);
}

export function recordEffectStatDelta(
	effectDefinition: EffectDef,
	context: EngineContext,
	statKey: StatKey,
	delta: number,
): void {
	if (Math.abs(delta) < STAT_SOURCE_EPSILON) {
		return;
	}
	const meta = resolveStatSourceMeta(effectDefinition, context, statKey);
	if (
		effectDefinition.type === 'stat' &&
		effectDefinition.method === 'add_pct'
	) {
		const params = isPlainObject(effectDefinition.params)
			? effectDefinition.params
			: undefined;
		const percentStatKey =
			typeof params?.['percentStat'] === 'string'
				? params['percentStat'].trim()
				: '';
		if (percentStatKey) {
			appendDependencyLink(meta, { type: 'stat', id: percentStatKey });
		}
	}
	applyStatDelta(context.activePlayer, statKey, delta, meta);
}
