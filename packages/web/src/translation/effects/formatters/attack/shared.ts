import {
	RESOURCES,
	STATS,
	type ResourceKey,
	type StatKey,
} from '@kingdom-builder/contents';
import type { AttackPlayerDiff } from '@kingdom-builder/protocol';
import { formatStatValue } from '../../../../utils/stats';
import type { AttackStatDescriptor, DiffFormatOptions } from './types';

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

function formatStatSigned(key: string, value: number): string {
	const formatted = formatStatValue(key, Math.abs(value));
	return `${value >= 0 ? '+' : '-'}${formatted}`;
}

type ResourceDiff = Extract<AttackPlayerDiff, { type: 'resource' }>;
type StatDiff = Extract<AttackPlayerDiff, { type: 'stat' }>;

type DiffFormatterMap = {
	[T in AttackPlayerDiff['type']]: (
		prefix: string,
		diff: Extract<AttackPlayerDiff, { type: T }>,
		options?: DiffFormatOptions,
	) => string;
};

const DIFF_FORMATTERS: DiffFormatterMap = {
	resource: (prefix, diff, options) =>
		formatResourceDiff(prefix, diff, options),
	stat: (prefix, diff) => formatStatDiff(prefix, diff),
};

export function formatResourceDiff(
	prefix: string,
	diff: ResourceDiff,
	options?: DiffFormatOptions,
): string {
	const info = RESOURCES[diff.key as ResourceKey];
	const icon = info?.icon || '';
	const label = info?.label || diff.key;
	const displayLabel = iconLabel(icon, label);
	const delta = diff.after - diff.before;
	const before = formatNumber(diff.before);
	const after = formatNumber(diff.after);
	if (options?.percent !== undefined) {
		const magnitude = Math.abs(options.percent);
		return `${prefix}: ${displayLabel} ${
			delta >= 0 ? '+' : '-'
		}${formatNumber(magnitude)}% (${before}→${after}) (${formatSigned(delta)})`;
	}
	if (options?.showPercent && diff.before !== 0 && delta !== 0) {
		const pct = (delta / diff.before) * 100;
		return `${prefix}: ${displayLabel} ${formatSigned(pct)}% (${before}→${after}) (${formatSigned(delta)})`;
	}
	return `${prefix}: ${displayLabel} ${formatSigned(delta)} (${before}→${after})`;
}

export function formatStatDiff(prefix: string, diff: StatDiff): string {
	const info = STATS[diff.key as StatKey];
	const icon = info?.icon || '';
	const label = info?.label || diff.key;
	const displayLabel = iconLabel(icon, label);
	const delta = diff.after - diff.before;
	const before = formatStatValue(String(diff.key), diff.before);
	const after = formatStatValue(String(diff.key), diff.after);
	return `${prefix}: ${displayLabel} ${formatStatSigned(
		String(diff.key),
		delta,
	)} (${before}→${after})`;
}

export function formatDiffCommon(
	prefix: string,
	diff: AttackPlayerDiff,
	options?: DiffFormatOptions,
): string {
	const formatter = DIFF_FORMATTERS[diff.type];
	if (!formatter) {
		throw new Error(`Unsupported attack diff type: ${diff.type}`);
	}
	return formatter(prefix, diff as never, options);
}
