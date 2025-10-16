import type { AttackPlayerDiff } from '@kingdom-builder/protocol';
import { formatStatValue } from '../../../../utils/stats';
import type { TranslationContext } from '../../../context';
import type { AttackStatDescriptor, DiffFormatOptions } from './types';
import {
	selectAttackResourceDescriptor,
	selectAttackStatDescriptor,
} from './registrySelectors';

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
		context: Pick<TranslationContext, 'assets'>,
		options?: DiffFormatOptions,
	) => string;
};

const DIFF_FORMATTERS: DiffFormatterMap = {
	resource: (prefix, diff, context, options) =>
		formatResourceDiff(prefix, diff, context, options),
	stat: (prefix, diff, context) => formatStatDiff(prefix, diff, context),
};

/**
 * Format a resource change into a human-readable diff string.
 *
 * @param prefix - Leading label inserted at the start of the formatted string (for example, an actor or source)
 * @param diff - Resource diff object containing `before` and `after` values and the resource `key`
 * @param context - Translation assets used to resolve the resource descriptor (icon and label)
 * @param options - Formatting options. If `percent` is provided, that magnitude is shown as a percentage; if `showPercent` is true, the percent change is included when applicable
 * @returns A single-line string containing the prefix, the resource label (with icon if available), the signed change, the before→after range, and optionally a percent representation
 */
export function formatResourceDiff(
	prefix: string,
	diff: ResourceDiff,
	context: Pick<TranslationContext, 'assets'>,
	options?: DiffFormatOptions,
): string {
	const descriptor = selectAttackResourceDescriptor(context, String(diff.key));
	const displayLabel = iconLabel(descriptor.icon, descriptor.label);
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

/**
 * Formats a stat change into a human-readable string with descriptor, signed delta, and before→after values.
 *
 * @param prefix - Text to prefix the formatted message (for example, the affected entity or category)
 * @param diff - The stat diff containing `key`, `before`, and `after` values
 * @param context - Translation assets used to resolve the stat descriptor and icon
 * @returns The formatted stat diff string, e.g. "prefix: [icon label] +3 (5→8)"
 */
export function formatStatDiff(
	prefix: string,
	diff: StatDiff,
	context: Pick<TranslationContext, 'assets'>,
): string {
	const descriptor = selectAttackStatDescriptor(context, String(diff.key));
	const displayLabel = iconLabel(descriptor.icon, descriptor.label);
	const delta = diff.after - diff.before;
	const before = formatStatValue(String(diff.key), diff.before);
	const after = formatStatValue(String(diff.key), diff.after);
	return `${prefix}: ${displayLabel} ${formatStatSigned(
		String(diff.key),
		delta,
	)} (${before}→${after})`;
}

/**
 * Dispatches an attack player diff to the appropriate formatter and returns the resulting formatted string.
 *
 * @param prefix - Text to prepend to the formatted diff
 * @param diff - The attack player diff to format
 * @param context - Translation context (only `assets` is required) used to resolve descriptors
 * @param options - Optional formatting options that influence output (e.g., percent display)
 * @returns The formatted representation of `diff` with `prefix`
 * @throws Error if `diff.type` is not supported by the available formatters
 */
export function formatDiffCommon(
	prefix: string,
	diff: AttackPlayerDiff,
	context: Pick<TranslationContext, 'assets'>,
	options?: DiffFormatOptions,
): string {
	const formatter = DIFF_FORMATTERS[diff.type];
	if (!formatter) {
		throw new Error(`Unsupported attack diff type: ${diff.type}`);
	}
	return formatter(prefix, diff as never, context, options);
}