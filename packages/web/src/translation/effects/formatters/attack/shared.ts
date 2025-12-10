import type { AttackPlayerDiff } from '@kingdom-builder/protocol';
import {
	formatResourceValue,
	resourceDisplaysAsPercent,
} from '../../../../utils/resourceSources';
import type { TranslationContext } from '../../../context';
import type { AttackStatDescriptor, DiffFormatOptions } from './types';
import { selectAttackResourceDescriptor } from './registrySelectors';

export function iconLabel(icon: string | undefined, label: string): string {
	return icon ? `${icon} ${label}` : label;
}

/**
 * Returns icon + label from content-provided resource descriptor.
 * Returns empty string if resource is not provided.
 */
export function attackResourceLabel(
	resource: AttackStatDescriptor | undefined,
): string {
	if (!resource) {
		return '';
	}
	return iconLabel(resource.icon, resource.label);
}

/**
 * Returns resource label with value appended.
 * Returns just the value if resource is not provided.
 */
export function attackResourceValue(
	resource: AttackStatDescriptor | undefined,
	value: string,
): string {
	const label = attackResourceLabel(resource);
	return label ? `${label} ${value}` : value;
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
	const formatted = formatResourceValue(key, Math.abs(value), assets);
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
	context: Pick<TranslationContext, 'assets' | 'resourceMetadata'>,
	options?: DiffFormatOptions,
): string {
	const key = String(diff.resourceId);
	const descriptor = selectAttackResourceDescriptor(context, key);
	const displayLabel = iconLabel(descriptor.icon, descriptor.label);
	const delta = diff.after - diff.before;

	// Use metadata to determine if value should be displayed as percent
	const isPercentValue = resourceDisplaysAsPercent(key, context.assets);

	const before = isPercentValue
		? formatResourceValue(key, diff.before, context.assets)
		: formatNumber(diff.before);
	const after = isPercentValue
		? formatResourceValue(key, diff.after, context.assets)
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
