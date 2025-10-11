import { formatStatValue } from '../../utils/stats';
import type { TranslationAssets } from '../context';

export interface SignedDelta {
	before: number;
	after: number;
	delta: number;
}

export function buildSignedDelta(before: number, after: number): SignedDelta {
	return {
		before,
		after,
		delta: after - before,
	};
}

export function signedNumber(value: number): string {
	return `${value >= 0 ? '+' : ''}${value}`;
}

export function iconPrefix(icon?: string): string {
	return icon ? `${icon} ` : '';
}

export function formatResourceChange(
	label: string,
	icon: string | undefined,
	change: SignedDelta,
): string {
	const prefix = iconPrefix(icon);
	const signed = signedNumber(change.delta);
	return `${prefix}${label} ${signed} (${change.before}→${change.after})`;
}

export function formatResourceSource(
	icon: string | undefined,
	fallback: string,
	change: SignedDelta,
	source: string | undefined,
): string | undefined {
	if (!source) {
		return undefined;
	}
	const symbol = icon || fallback;
	const deltaText = signedNumber(change.delta);
	return ` (${symbol}${deltaText} from ${source})`;
}

export function formatStatChange(
	label: string,
	icon: string | undefined,
	key: string,
	change: SignedDelta,
	assets: TranslationAssets,
): string {
	const prefix = iconPrefix(icon);
	const before = formatStatValue(key, change.before, assets);
	const after = formatStatValue(key, change.after, assets);
	const delta = formatStatValue(key, change.delta, assets);
	const sign = change.delta >= 0 ? '+' : '';
	return `${prefix}${label} ${sign}${delta} (${before}→${after})`;
}

export function formatPercentBreakdown(
	icon: string,
	before: string,
	popIcon: string,
	population: number,
	growthIcon: string,
	growth: string,
	after: string,
): string {
	const base = `${icon}${before}`;
	const multiplier = `${popIcon}${population} * ${growthIcon}${growth}`;
	const total = `${icon}${after}`;
	return ` (${base} + (${multiplier}) = ${total})`;
}
