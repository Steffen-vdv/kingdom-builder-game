import type {
	SessionSnapshotMetadata,
	SessionOverviewMetadata,
	SessionOverviewHero,
	SessionOverviewTokenMap,
} from '@kingdom-builder/protocol';
import type { SessionResourceValueMetadata } from '@kingdom-builder/protocol/session/resourceV2';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';

type MetadataRecord<T> = Record<string, T>;

interface MergeSessionMetadataOptions {
	baseMetadata: SessionStaticMetadataPayload;
	snapshotMetadata: SessionSnapshotMetadata;
}

const clone = <Value>(value: Value): Value => {
	return structuredClone(value);
};

export function mergeSessionMetadata({
	baseMetadata,
	snapshotMetadata,
}: MergeSessionMetadataOptions): SessionSnapshotMetadata {
	const baseClone = clone(baseMetadata) as Partial<SessionSnapshotMetadata>;
	const merged: SessionSnapshotMetadata = {
		...baseClone,
		passiveEvaluationModifiers: clone(
			snapshotMetadata.passiveEvaluationModifiers,
		),
	};
	if (snapshotMetadata.effectLogs !== undefined) {
		merged.effectLogs = clone(snapshotMetadata.effectLogs);
	}
	const values = mergeResourceValueMetadata(
		baseClone.values,
		snapshotMetadata.values,
	);
	if (values !== undefined) {
		merged.values = values;
	} else {
		delete merged.values;
	}
	const buildings = mergeRecord(
		baseClone.buildings,
		snapshotMetadata.buildings,
	);
	if (buildings !== undefined) {
		merged.buildings = buildings;
	} else {
		delete merged.buildings;
	}
	const developments = mergeRecord(
		baseClone.developments,
		snapshotMetadata.developments,
	);
	if (developments !== undefined) {
		merged.developments = developments;
	} else {
		delete merged.developments;
	}
	const phases = mergeRecord(baseClone.phases, snapshotMetadata.phases);
	if (phases !== undefined) {
		merged.phases = phases;
	} else {
		delete merged.phases;
	}
	const triggers = mergeRecord(baseClone.triggers, snapshotMetadata.triggers);
	if (triggers !== undefined) {
		merged.triggers = triggers;
	} else {
		delete merged.triggers;
	}
	const assets = mergeRecord(baseClone.assets, snapshotMetadata.assets);
	if (assets !== undefined) {
		merged.assets = assets;
	} else {
		delete merged.assets;
	}
	const overview = mergeOverview(baseClone.overview, snapshotMetadata.overview);
	if (overview !== undefined) {
		merged.overview = overview;
	} else {
		delete merged.overview;
	}
	return merged;
}

function mergeResourceValueMetadata(
	base: SessionResourceValueMetadata | undefined,
	overrides: SessionResourceValueMetadata | undefined,
): SessionResourceValueMetadata | undefined {
	if (!base && !overrides) {
		return undefined;
	}
	const descriptors = mergeRecord(base?.descriptors, overrides?.descriptors);
	const groups = mergeRecord(base?.groups, overrides?.groups);
	const tiers = mergeRecord(base?.tiers, overrides?.tiers);
	const orderedSource = overrides?.ordered ?? base?.ordered;
	const ordered = orderedSource ? clone(orderedSource) : undefined;
	const recentSource = overrides?.recent ?? base?.recent;
	const recent = recentSource ? clone(recentSource) : undefined;
	if (!descriptors && !groups && !tiers && !ordered && !recent) {
		return undefined;
	}
	const metadata: SessionResourceValueMetadata = {
		...(descriptors ? { descriptors } : {}),
		...(groups ? { groups } : {}),
		...(tiers ? { tiers } : {}),
		...(ordered ? { ordered } : {}),
		...(recent ? { recent } : {}),
	};
	return metadata;
}

function mergeRecord<T>(
	base: MetadataRecord<T> | undefined,
	overrides: MetadataRecord<T> | undefined,
): MetadataRecord<T> | undefined {
	if (!base && !overrides) {
		return undefined;
	}
	const cloneBase: MetadataRecord<T> = base ? clone(base) : {};
	if (!overrides) {
		return cloneBase;
	}
	for (const [key, value] of Object.entries(overrides)) {
		cloneBase[key] = clone(value);
	}
	return cloneBase;
}

function mergeOverview(
	base: SessionOverviewMetadata | undefined,
	overrides: SessionOverviewMetadata | undefined,
): SessionOverviewMetadata | undefined {
	if (!base && !overrides) {
		return undefined;
	}
	const result: SessionOverviewMetadata = base ? clone(base) : {};
	if (!overrides) {
		return result;
	}
	if (overrides.hero) {
		const heroBase = result.hero ? clone(result.hero) : {};
		const hero: SessionOverviewHero = {
			...heroBase,
			...clone(overrides.hero),
		};
		if (overrides.hero.tokens || heroBase.tokens) {
			const heroTokens = mergeStringRecord(
				heroBase.tokens,
				overrides.hero.tokens,
			);
			if (heroTokens !== undefined) {
				hero.tokens = heroTokens;
			} else {
				delete hero.tokens;
			}
		}
		result.hero = hero;
	}
	if (overrides.sections !== undefined) {
		result.sections = clone(overrides.sections);
	}
	if (overrides.tokens || result.tokens) {
		const mergedTokens = mergeTokenMap(result.tokens, overrides.tokens);
		if (mergedTokens !== undefined) {
			result.tokens = mergedTokens;
		} else {
			delete result.tokens;
		}
	}
	return result;
}

function mergeStringRecord(
	base: Record<string, string> | undefined,
	overrides: Record<string, string> | undefined,
): Record<string, string> | undefined {
	if (!base && !overrides) {
		return undefined;
	}
	const result: Record<string, string> = base ? clone(base) : {};
	if (!overrides) {
		return result;
	}
	for (const [key, value] of Object.entries(overrides)) {
		result[key] = value;
	}
	return result;
}

function mergeTokenMap(
	base: SessionOverviewTokenMap | undefined,
	overrides: SessionOverviewTokenMap | undefined,
): SessionOverviewTokenMap | undefined {
	if (!base && !overrides) {
		return undefined;
	}
	const result: SessionOverviewTokenMap = base ? structuredClone(base) : {};
	if (!overrides) {
		return result;
	}
	for (const [category, entries] of Object.entries(overrides)) {
		const categoryKey = category as keyof SessionOverviewTokenMap;
		if (!entries) {
			delete result[categoryKey];
			continue;
		}
		const baseEntries = result[categoryKey];
		if (!baseEntries) {
			result[categoryKey] = structuredClone(entries);
			continue;
		}
		const mergedEntries = structuredClone(baseEntries);
		for (const [tokenKey, values] of Object.entries(entries)) {
			mergedEntries[tokenKey] = structuredClone(values);
		}
		result[categoryKey] = mergedEntries;
	}
	return result;
}
