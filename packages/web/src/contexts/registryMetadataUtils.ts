import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { DEFAULT_REGISTRY_METADATA } from './defaultRegistryMetadata';
import type { OverviewContentTemplate } from './overviewContentTypes';

export type SnapshotMetadataWithOverview = SessionSnapshotMetadata & {
	readonly overviewContent: OverviewContentTemplate;
};

const isOverviewContent = (
	value: unknown,
): value is OverviewContentTemplate => {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<OverviewContentTemplate>;
	return (
		typeof candidate.hero === 'object' &&
		candidate.hero !== null &&
		Array.isArray(candidate.sections) &&
		typeof candidate.tokens === 'object' &&
		candidate.tokens !== null
	);
};

const readOverviewContent = (
	snapshot: SessionSnapshotMetadata,
): OverviewContentTemplate | undefined => {
	const candidate = (snapshot as { overviewContent?: unknown }).overviewContent;
	if (!isOverviewContent(candidate)) {
		return undefined;
	}
	return candidate;
};

const DEFAULT_OVERVIEW_CONTENT: OverviewContentTemplate = (() => {
	const content = readOverviewContent(DEFAULT_REGISTRY_METADATA);
	if (!content) {
		throw new Error('Default metadata must provide overview content.');
	}
	return content;
})();

const mergeRecords = <TValue>(
	defaults: Record<string, TValue> | undefined,
	overrides: Record<string, TValue> | undefined,
): Record<string, TValue> | undefined => {
	if (!defaults && !overrides) {
		return undefined;
	}
	return {
		...(defaults ?? {}),
		...(overrides ?? {}),
	};
};

const ensureOverviewContent = (
	snapshot: SessionSnapshotMetadata,
): SnapshotMetadataWithOverview => {
	const overviewContent = readOverviewContent(snapshot);
	if (overviewContent) {
		return snapshot as SnapshotMetadataWithOverview;
	}
	return {
		...snapshot,
		overviewContent: DEFAULT_OVERVIEW_CONTENT,
	};
};

export const mergeMetadataWithDefaults = (
	metadata: SessionSnapshotMetadata,
): SnapshotMetadataWithOverview => {
	const defaults = ensureOverviewContent(DEFAULT_REGISTRY_METADATA);
	const enriched = ensureOverviewContent(metadata);
	if (enriched === defaults) {
		return defaults;
	}
	return {
		...defaults,
		...enriched,
		passiveEvaluationModifiers: {
			...(defaults.passiveEvaluationModifiers ?? {}),
			...(enriched.passiveEvaluationModifiers ?? {}),
		},
		resources: mergeRecords(defaults.resources, enriched.resources),
		populations: mergeRecords(defaults.populations, enriched.populations),
		buildings: mergeRecords(defaults.buildings, enriched.buildings),
		developments: mergeRecords(defaults.developments, enriched.developments),
		stats: mergeRecords(defaults.stats, enriched.stats),
		phases: mergeRecords(defaults.phases, enriched.phases),
		triggers: mergeRecords(defaults.triggers, enriched.triggers),
		assets: mergeRecords(defaults.assets, enriched.assets),
		overviewContent: enriched.overviewContent,
	};
};
