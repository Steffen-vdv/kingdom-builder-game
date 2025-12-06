import type { AttackPlayerDiff } from '@kingdom-builder/protocol';
import {
	formatStatValue,
	statDisplaysAsPercent,
} from '../../../../utils/stats';
import type { TranslationContext } from '../../../context';
import type { AttackStatDescriptor, DiffFormatOptions } from './types';
import { selectAttackResourceDescriptor } from './registrySelectors';

export function iconLabel(icon: string | undefined, label: string): string {
	return icon ? `${icon} ${label}` : label;
}

export function attackStatLabel(
	stat: AttackStatDescriptor | undefined,
	fallback: string,
): string {
	return stat ? iconLabel(stat.icon, stat.label) : fallback;
}

export function attackStatValue(
	stat: AttackStatDescriptor | undefined,
	fallback: string,
	value: string,
): string {
	const label = attackStatLabel(stat, fallback);
	return `${label} ${value}`;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export function formatNumber(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return NUMBER_FORMATTER.format(value);
}

export function formatPercent(value: number): string {
	return `${formatNumber(value * 100)}%`;
}

export function formatSignedValue(
	value: number,
	formatter: (value: number) => string,
): string {
	const magnitude = formatter(Math.abs(value));
	const prefix = value >= 0 ? '+' : '-';
	return `${prefix}${magnitude}`;
}

function formatSigned(value: number): string {
	const formatted = formatNumber(Math.abs(value));
	return `${value >= 0 ? '+' : '-'}${formatted}`;
}

function formatValueSigned(
	key: string,
	value: number,
	assets?: TranslationContext['assets'],
): string {
	const formatted = formatStatValue(key, Math.abs(value), assets);
	return `${value >= 0 ? '+' : '-'}${formatted}`;
}

/**
 * Formats a player diff using metadata-driven behavior.
 * The display format (percent vs number) is determined by metadata properties
 * like displayAsPercent, not by semantic type discrimination.
 */
export function formatDiffCommon(
	prefix: string,
	diff: AttackPlayerDiff,
	context: Pick<TranslationContext, 'assets' | 'resourceMetadataV2'>,
	options?: DiffFormatOptions,
): string {
	const key = String(diff.key);
	const descriptor = selectAttackResourceDescriptor(context, key);
	const displayLabel = iconLabel(descriptor.icon, descriptor.label);
	const delta = diff.after - diff.before;

	// Use metadata to determine if value should be displayed as percent
	const isPercentValue = statDisplaysAsPercent(key, context.assets);

	const before = isPercentValue
		? formatStatValue(key, diff.before, context.assets)
		: formatNumber(diff.before);
	const after = isPercentValue
		? formatStatValue(key, diff.after, context.assets)
		: formatNumber(diff.after);
	const signedDelta = isPercentValue
		? formatValueSigned(key, delta, context.assets)
		: formatSigned(delta);

	if (options?.percent !== undefined) {
		const magnitude = Math.abs(options.percent);
		return `${prefix}: ${displayLabel} ${
			delta >= 0 ? '+' : '-'
		}${formatNumber(magnitude)}% (${before}→${after}) (${signedDelta})`;
	}
	if (options?.showPercent && diff.before !== 0 && delta !== 0) {
		const pct = (delta / diff.before) * 100;
		return `${prefix}: ${displayLabel} ${formatSigned(pct)}% (${before}→${after}) (${signedDelta})`;
	}
	return `${prefix}: ${displayLabel} ${signedDelta} (${before}→${after})`;
}
