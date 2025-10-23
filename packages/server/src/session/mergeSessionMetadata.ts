import type {
        SessionSnapshotMetadata,
        SessionOverviewMetadata,
        SessionOverviewHero,
        SessionOverviewTokenMap,
        SessionResourceValueMetadata,
        SessionResourceValueDescriptor,
        SessionResourceGroupDescriptor,
} from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';

type MetadataRecord<T> = Record<string, T>;

interface MergeSessionMetadataOptions {
        baseMetadata: SessionStaticMetadataPayload;
        snapshotMetadata: SessionSnapshotMetadata;
}

const typedStructuredClone = <Value>(value: Value): Value => {
        return structuredClone(value) as Value;
};

export function mergeSessionMetadata({
        baseMetadata,
        snapshotMetadata,
}: MergeSessionMetadataOptions): SessionSnapshotMetadata {
        const baseClone = typedStructuredClone(baseMetadata) as Partial<
                SessionSnapshotMetadata
        >;
        const merged: SessionSnapshotMetadata = {
                ...baseClone,
                passiveEvaluationModifiers: typedStructuredClone(
                        snapshotMetadata.passiveEvaluationModifiers,
                ),
        };
        if (snapshotMetadata.effectLogs !== undefined) {
                merged.effectLogs = typedStructuredClone(snapshotMetadata.effectLogs);
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

function mergeRecord<T>(
        base: MetadataRecord<T> | undefined,
        overrides: MetadataRecord<T> | undefined,
): MetadataRecord<T> | undefined {
        if (!base && !overrides) {
                return undefined;
        }
        const cloneBase = base
                ? typedStructuredClone(base)
                : ({} as MetadataRecord<T>);
        if (!overrides) {
                return cloneBase;
        }
        for (const [key, value] of Object.entries(overrides)) {
                cloneBase[key] = typedStructuredClone(value);
        }
        return cloneBase;
}

function mergeResourceValueRecord<
	T extends SessionResourceValueDescriptor | SessionResourceGroupDescriptor,
>(
	base: Record<string, T> | undefined,
	overrides: Record<string, T> | undefined,
): Record<string, T> | undefined {
	return mergeRecord(base, overrides);
}

function mergeResourceValueMetadata(
	base: SessionResourceValueMetadata | undefined,
	overrides: SessionResourceValueMetadata | undefined,
): SessionResourceValueMetadata | undefined {
        if (!base && !overrides) {
                return undefined;
        }
        const result: SessionResourceValueMetadata = {};
        if (base?.descriptors) {
                result.descriptors = typedStructuredClone(base.descriptors);
        }
        if (base?.groups) {
                result.groups = typedStructuredClone(base.groups);
        }
        if (base?.tiers) {
                result.tiers = typedStructuredClone(base.tiers);
        }
        if (base?.ordered) {
                result.ordered = typedStructuredClone(base.ordered);
        }
        if (base?.recent) {
                result.recent = typedStructuredClone(base.recent);
        }

        if (!overrides) {
                return result;
        }

	const descriptors = mergeResourceValueRecord(
		result.descriptors,
		overrides.descriptors,
	);
	if (descriptors) {
		result.descriptors = descriptors;
	} else {
		delete result.descriptors;
	}

	const groups = mergeResourceValueRecord(result.groups, overrides.groups);
	if (groups) {
		result.groups = groups;
	} else {
		delete result.groups;
	}

        if (overrides.tiers) {
                result.tiers = mergeRecord(result.tiers, overrides.tiers);
        } else if (result.tiers) {
                result.tiers = typedStructuredClone(result.tiers);
        }

        if (overrides.ordered) {
                result.ordered = typedStructuredClone(overrides.ordered);
        }

        if (overrides.recent) {
                result.recent = typedStructuredClone(overrides.recent);
        } else {
                delete result.recent;
        }

	if (
		!result.descriptors &&
		!result.groups &&
		!result.tiers &&
		!result.ordered &&
		!result.recent
	) {
		return undefined;
	}
	return result;
}

function mergeOverview(
        base: SessionOverviewMetadata | undefined,
        overrides: SessionOverviewMetadata | undefined,
): SessionOverviewMetadata | undefined {
        if (!base && !overrides) {
                return undefined;
        }
        const result: SessionOverviewMetadata = base
                ? typedStructuredClone(base)
                : {};
        if (!overrides) {
                return result;
        }
        if (overrides.hero) {
                const heroBase = result.hero
                        ? typedStructuredClone(result.hero)
                        : {};
                const hero: SessionOverviewHero = {
                        ...heroBase,
                        ...typedStructuredClone(overrides.hero),
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
                result.sections = typedStructuredClone(overrides.sections);
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
        const result = base
                ? typedStructuredClone(base)
                : ({} as Record<string, string>);
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
        const result: SessionOverviewTokenMap = base
                ? typedStructuredClone(base)
                : {};
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
                        result[categoryKey] = typedStructuredClone(entries);
                        continue;
                }
                const mergedEntries = typedStructuredClone(baseEntries);
                for (const [tokenKey, values] of Object.entries(entries)) {
                        mergedEntries[tokenKey] = typedStructuredClone(values);
                }
                result[categoryKey] = mergedEntries;
        }
        return result;
}
