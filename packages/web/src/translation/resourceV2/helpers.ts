import { gainOrLose, signed } from '../effects/helpers';
import { formatDetailText } from '../../utils/stats/format';
import type {
	ResourceV2RecentChange,
	ResourceV2TierStatus,
	ResourceV2TranslationSource,
	ResourceV2ValueDescriptor,
	ResourceV2ValueSnapshot,
} from './types';

const NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2,
	minimumFractionDigits: 0,
});

export function formatDescriptorLabel(
	descriptor: ResourceV2ValueDescriptor | undefined,
	fallbackId: string,
): string {
	const label = descriptor?.label ?? formatDetailText(fallbackId);
	const icon = descriptor?.icon?.trim();
	if (icon) {
		return `${icon} ${label}`;
	}
	return label;
}

export function formatNumericValue(
	descriptor: ResourceV2ValueDescriptor | undefined,
	value: number,
): string {
	const normalized = Math.abs(value);
	const percentFormat =
		descriptor?.displayAsPercent === true ||
		(descriptor?.format &&
			typeof descriptor.format === 'object' &&
			descriptor.format.percent);
	const formatted = percentFormat
		? NUMBER_FORMAT.format(normalized * 100)
		: NUMBER_FORMAT.format(normalized);
	return percentFormat ? `${formatted}%` : formatted;
}

export function formatBounds(
	descriptor: ResourceV2ValueDescriptor | undefined,
	snapshot: ResourceV2ValueSnapshot,
): string | undefined {
	const { lowerBound, upperBound } = snapshot;
	if (lowerBound === undefined && upperBound === undefined) {
		return undefined;
	}
	const parts: string[] = [];
	if (lowerBound !== undefined) {
		parts.push(formatNumericValue(descriptor, lowerBound));
	}
	if (upperBound !== undefined) {
		parts.push(formatNumericValue(descriptor, upperBound));
	}
	if (parts.length === 1) {
		return `Bounds ${parts[0]}`;
	}
	if (parts.length === 2) {
		return `Bounds ${parts[0]}–${parts[1]}`;
	}
	return undefined;
}

export function formatTierStatus(
	tier: ResourceV2TierStatus | undefined,
): string | undefined {
	if (!tier) {
		return undefined;
	}
	const steps = tier.steps ?? [];
	const stepLookup = new Map(steps.map((step) => [step.id, step]));
	const current = tier.currentStepId
		? stepLookup.get(tier.currentStepId)
		: undefined;
	const next = tier.nextStepId ? stepLookup.get(tier.nextStepId) : undefined;
	const parts: string[] = [];
	if (current) {
		parts.push(current.label ?? formatDetailText(current.id));
	} else if (tier.currentStepId) {
		parts.push(formatDetailText(tier.currentStepId));
	}
	const progress = tier.progress;
	if (progress) {
		const { current: value, max } = progress;
		if (max !== undefined) {
			parts.push(
				`(${NUMBER_FORMAT.format(value)} / ${NUMBER_FORMAT.format(max)})`,
			);
		} else {
			parts.push(`(${NUMBER_FORMAT.format(value)})`);
		}
	}
	const summary = parts.length > 0 ? parts.join(' ') : undefined;
	if (next) {
		const nextLabel = next.label ?? formatDetailText(next.id);
		return summary
			? `Tier: ${summary} → Next: ${nextLabel}`
			: `Tier: Next ${nextLabel}`;
	}
	return summary ? `Tier: ${summary}` : undefined;
}

export function formatValueLine(
	id: string,
	descriptor: ResourceV2ValueDescriptor | undefined,
	snapshot: ResourceV2ValueSnapshot,
	options: {
		includeBounds?: boolean;
		tier?: ResourceV2TierStatus | undefined;
	} = {},
): string {
	const label = formatDescriptorLabel(descriptor, id);
	const baseAmount = formatNumericValue(descriptor, snapshot.value);
	const sign = snapshot.value >= 0 ? '' : '-';
	const normalizedAmount = sign ? `${sign}${baseAmount}` : baseAmount;
	const parts: string[] = [`${label} ${normalizedAmount}`];
	if (options.includeBounds) {
		const boundsText = formatBounds(descriptor, snapshot);
		if (boundsText) {
			parts.push(boundsText);
		}
	}
	const tierText = formatTierStatus(options.tier);
	if (tierText) {
		parts.push(tierText);
	}
	return parts.join(' — ');
}

export function formatRecentChange(
	descriptor: ResourceV2ValueDescriptor | undefined,
	change: ResourceV2RecentChange,
): string {
	const verb = gainOrLose(change.amount);
	const amount = formatNumericValue(descriptor, change.amount);
	const sign = change.amount >= 0 ? signed(change.amount) : '-';
	const label = formatDescriptorLabel(descriptor, change.resourceId);
	return `${verb} ${sign}${amount} ${label}`;
}

export function resolveDescriptor(
	source: ResourceV2TranslationSource,
	id: string,
): ResourceV2ValueDescriptor | undefined {
	return source.metadata.descriptors?.[id];
}

export function resolveSnapshot(
	source: ResourceV2TranslationSource,
	id: string,
): ResourceV2ValueSnapshot {
	const snapshot = source.values[id];
	if (snapshot) {
		return snapshot;
	}
	return { value: 0 };
}

export function resolveTier(
	source: ResourceV2TranslationSource,
	id: string,
): ResourceV2TierStatus | undefined {
	return source.metadata.tiers?.[id];
}
