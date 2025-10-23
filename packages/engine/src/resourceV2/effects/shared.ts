import type { EffectDef } from '@kingdom-builder/protocol';

import type {
	PlayerResourceV2State,
	ResourceV2HookSuppressionMeta,
} from '../../state';

export type ResourceV2RoundingMode = 'up' | 'down' | 'nearest';

type ResourceChangeKind = 'add' | 'remove';

export interface ResourceV2EffectParams extends Record<string, unknown> {
	readonly id: string;
	readonly amount?: number;
	readonly percent?: number;
}

export interface ResourceV2EffectMeta extends Record<string, unknown> {
	readonly reconciliation?: 'clamp';
	readonly suppressHooks?: ResourceV2HookSuppressionMeta;
	readonly usesPercent?: true;
}

export function assertKnownResource(state: PlayerResourceV2State, id: string) {
	if (!Object.prototype.hasOwnProperty.call(state.amounts, id)) {
		throw new Error(`Unknown ResourceV2 resource id: ${id}`);
	}
}

export function resolveRounding(
	round?: EffectDef['round'],
): ResourceV2RoundingMode {
	if (round === 'up' || round === 'down') {
		return round;
	}

	return 'nearest';
}

export function resolvePercentDelta(
	state: PlayerResourceV2State,
	resourceId: string,
	percent: number,
	mult: number,
	rounding: ResourceV2RoundingMode,
	kind: ResourceChangeKind,
): number {
	const current = state.amounts[resourceId] ?? 0;
	const totalPercent = percent * mult;
	const raw = (current * totalPercent) / 100;
	const rounded = round(raw, rounding);
	if (!Number.isFinite(rounded)) {
		throw new Error(
			'ResourceV2 percent change resolved to a non-finite amount.',
		);
	}
	return kind === 'remove' ? -rounded : rounded;
}

export function round(value: number, mode: ResourceV2RoundingMode): number {
	if (mode === 'up') {
		return value >= 0 ? Math.ceil(value) : Math.floor(value);
	}

	if (mode === 'down') {
		return value >= 0 ? Math.floor(value) : Math.ceil(value);
	}

	const floored = Math.floor(value);
	const fractional = value - floored;
	if (fractional < 0.5) {
		return floored;
	}

	return Math.ceil(value);
}
