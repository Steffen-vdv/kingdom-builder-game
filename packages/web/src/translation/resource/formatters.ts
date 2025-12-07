import type { SessionRecentResourceGain } from '@kingdom-builder/protocol';
import type { SessionMetadataFormat } from '@kingdom-builder/protocol/session';
import type { Summary, SummaryGroup } from '../content/types';

export interface ResourceMetadataSnapshot {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string | null;
	readonly displayAsPercent?: boolean;
	readonly format?: SessionMetadataFormat;
}

export interface ResourceValueSnapshot {
	readonly id: string;
	readonly current: number;
	readonly previous?: number;
	readonly delta?: number;
	readonly lowerBound?: number | null;
	readonly upperBound?: number | null;
	readonly forecastDelta?: number | null;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

function formatNumber(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return NUMBER_FORMATTER.format(value);
}

function readFormatConfig(
	metadata: ResourceMetadataSnapshot,
): SessionMetadataFormat | undefined {
	return metadata.format;
}

function shouldDisplayPercent(metadata: ResourceMetadataSnapshot): boolean {
	const format = readFormatConfig(metadata);
	if (typeof format === 'object' && format?.percent) {
		return true;
	}
	return Boolean(metadata.displayAsPercent);
}

function formatMagnitude(
	value: number,
	metadata: ResourceMetadataSnapshot,
): string {
	const format = readFormatConfig(metadata);
	const prefix = typeof format === 'object' ? format?.prefix : undefined;
	const formatted = shouldDisplayPercent(metadata)
		? `${formatNumber(value * 100)}%`
		: formatNumber(value);
	if (prefix) {
		return `${prefix}${formatted}`;
	}
	return formatted;
}

function formatSignedMagnitude(
	value: number,
	metadata: ResourceMetadataSnapshot,
): string {
	const sign = value >= 0 ? '+' : '-';
	const formatted = formatMagnitude(Math.abs(value), metadata);
	return `${sign}${formatted}`;
}

function computeDelta(snapshot: ResourceValueSnapshot): number | undefined {
	if (typeof snapshot.delta === 'number') {
		return snapshot.delta;
	}
	if (typeof snapshot.previous === 'number') {
		return snapshot.current - snapshot.previous;
	}
	return undefined;
}

function resolvePreviousValue(
	snapshot: ResourceValueSnapshot,
	delta: number | undefined,
): number | undefined {
	if (typeof snapshot.previous === 'number') {
		return snapshot.previous;
	}
	if (typeof delta === 'number') {
		return snapshot.current - delta;
	}
	return undefined;
}

function pushSummaryEntry(target: Summary, entry: string | SummaryGroup): void {
	target.push(entry);
}

export function formatResourceSummary(
	metadata: ResourceMetadataSnapshot,
	snapshot: ResourceValueSnapshot,
): string {
	const label = metadata.label || metadata.id;
	const iconPrefix = metadata.icon ? `${metadata.icon} ` : '';
	const delta = computeDelta(snapshot);
	if (delta === undefined) {
		const current = formatMagnitude(snapshot.current, metadata);
		return `${iconPrefix}${label} ${current}`;
	}
	const previous =
		resolvePreviousValue(snapshot, delta) ?? snapshot.current - delta;
	const beforeText = formatMagnitude(previous, metadata);
	const afterText = formatMagnitude(snapshot.current, metadata);
	const deltaText = formatSignedMagnitude(delta, metadata);
	return `${iconPrefix}${label} ${deltaText} (${beforeText}→${afterText})`;
}

export function buildResourceHoverSections(
	metadata: ResourceMetadataSnapshot,
	snapshot: ResourceValueSnapshot,
): Summary {
	const sections: Summary = [];
	if (metadata.description) {
		const description = metadata.description.trim();
		if (description.length > 0) {
			pushSummaryEntry(sections, description);
		}
	}
	const valueItems: Summary = [];
	const delta = computeDelta(snapshot);
	const previous = resolvePreviousValue(snapshot, delta);
	pushSummaryEntry(
		valueItems,
		`Current: ${formatMagnitude(snapshot.current, metadata)}`,
	);
	if (previous !== undefined) {
		pushSummaryEntry(
			valueItems,
			`Previous: ${formatMagnitude(previous, metadata)}`,
		);
	}
	if (delta !== undefined) {
		pushSummaryEntry(
			valueItems,
			`Change: ${formatSignedMagnitude(delta, metadata)}`,
		);
	}
	if (
		typeof snapshot.forecastDelta === 'number' &&
		snapshot.forecastDelta !== 0
	) {
		pushSummaryEntry(
			valueItems,
			`Forecast: ${formatSignedMagnitude(snapshot.forecastDelta, metadata)}`,
		);
	}
	if (valueItems.length > 0) {
		pushSummaryEntry(sections, {
			title: 'Value',
			items: valueItems,
			_hoist: true,
		});
	}
	const boundItems: Summary = [];
	if (snapshot.lowerBound !== undefined && snapshot.lowerBound !== null) {
		pushSummaryEntry(
			boundItems,
			`Lower bound: ${formatMagnitude(snapshot.lowerBound, metadata)}`,
		);
	}
	if (snapshot.upperBound !== undefined && snapshot.upperBound !== null) {
		pushSummaryEntry(
			boundItems,
			`Upper bound: ${formatMagnitude(snapshot.upperBound, metadata)}`,
		);
	}
	if (boundItems.length > 0) {
		pushSummaryEntry(sections, {
			title: 'Bounds',
			items: boundItems,
		});
	}
	return sections;
}

export function buildResourceSignedGainEntries(
	metadata: ResourceMetadataSnapshot,
	snapshot: ResourceValueSnapshot,
): SessionRecentResourceGain[] {
	const delta = computeDelta(snapshot);
	if (!delta) {
		return [];
	}
	return [
		{
			key: metadata.id,
			amount: delta,
		},
	];
}
