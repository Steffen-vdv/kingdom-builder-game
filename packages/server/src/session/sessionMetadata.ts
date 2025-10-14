import {
	STATS,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
import type {
	SessionRegistriesPayload,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionOverviewMetadata,
	SessionOverviewTokenMap,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol';
import type { createEngineSession } from '@kingdom-builder/engine';

type EngineSessionOptions = Parameters<typeof createEngineSession>[0];

export type EngineSessionBaseOptions = Omit<
	EngineSessionOptions,
	'devMode' | 'config'
>;

export function buildSessionMetadata(
	baseOptions: EngineSessionBaseOptions,
	registries: SessionRegistriesPayload,
): SessionSnapshotMetadata {
	const resources = buildResourceMetadata(registries.resources);
	const populations = buildDefinitionMetadata(
		baseOptions.populations.entries(),
	);
	const buildings = buildDefinitionMetadata(baseOptions.buildings.entries());
	const developments = buildDefinitionMetadata(
		baseOptions.developments.entries(),
	);
	const stats = buildStatMetadata();
	const phases = buildPhaseMetadata(baseOptions.phases);
	const triggers = buildTriggerMetadata();
	const assets = buildAssetMetadata();
	const overview = buildOverviewMetadata();
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources,
		populations,
		buildings,
		developments,
		stats,
		phases,
		triggers,
		assets,
	};
	if (overview) { metadata.overview = overview; }
	return metadata;
}

export function enrichSessionSnapshot(
	snapshot: SessionSnapshot,
	baseMetadata: SessionSnapshotMetadata,
): SessionSnapshot {
	const metadata = mergeSnapshotMetadata(
		structuredClone(baseMetadata),
		structuredClone(snapshot.metadata),
	);
	return {
		...snapshot,
		metadata,
	};
}

export function mergeSnapshotMetadata(
	base: SessionSnapshotMetadata,
	dynamic: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: structuredClone(
			dynamic.passiveEvaluationModifiers ??
				base.passiveEvaluationModifiers ??
				{},
		),
	};
	if (dynamic.effectLogs) { metadata.effectLogs = dynamic.effectLogs; } else if (base.effectLogs) {
		metadata.effectLogs = base.effectLogs;
	}
	metadata.resources = mergeDescriptorRecord(base.resources, dynamic.resources);
	metadata.populations = mergeDescriptorRecord(
		base.populations,
		dynamic.populations,
	);
	metadata.buildings = mergeDescriptorRecord(base.buildings, dynamic.buildings);
	metadata.developments = mergeDescriptorRecord(
		base.developments,
		dynamic.developments,
	);
	metadata.stats = mergeDescriptorRecord(base.stats, dynamic.stats);
	metadata.phases = mergeDescriptorRecord(base.phases, dynamic.phases);
	metadata.triggers = mergeDescriptorRecord(base.triggers, dynamic.triggers);
	metadata.assets = mergeDescriptorRecord(base.assets, dynamic.assets);
	const overview = mergeOverviewMetadata(base.overview, dynamic.overview);
	if (overview) { metadata.overview = overview; }
	return metadata;
}

function buildResourceMetadata(
	registry: SessionRegistriesPayload['resources'],
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, definition] of Object.entries(registry)) {
		const descriptor: SessionMetadataDescriptor = {};
		if (definition.label) { descriptor.label = definition.label; }
		if (definition.icon) { descriptor.icon = definition.icon; }
		if (definition.description) { descriptor.description = definition.description; }
		descriptors[key] = descriptor;
	}
	return descriptors;
}

function buildDefinitionMetadata<
	DefinitionType extends {
		name?: string | undefined;
		icon?: string | undefined;
		description?: string | undefined;
	},
>(
	entries: Iterable<readonly [string, DefinitionType]>,
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of entries) {
		const descriptor: SessionMetadataDescriptor = {};
		if (definition.name) { descriptor.label = definition.name; }
		if (definition.icon) { descriptor.icon = definition.icon; }
		if (definition.description) { descriptor.description = definition.description; }
		descriptors[id] = descriptor;
	}
	return descriptors;
}

function buildStatMetadata(): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const [key, definition] of Object.entries(STATS)) {
		const descriptor: SessionMetadataDescriptor = {};
		if (definition.label) { descriptor.label = definition.label; }
		if (definition.icon) { descriptor.icon = definition.icon; }
		if (definition.description) { descriptor.description = definition.description; }
		if (definition.displayAsPercent !== undefined) {
			descriptor.displayAsPercent = definition.displayAsPercent;
		}
		descriptors[key] = descriptor;
	}
	return descriptors;
}

function buildPhaseMetadata(
	phases: EngineSessionBaseOptions['phases'],
): Record<string, SessionPhaseMetadata> {
	const descriptors: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const entry: SessionPhaseMetadata = { id: phase.id };
		entry.label = phase.label ?? formatLabel(phase.id);
		if (phase.icon) { entry.icon = phase.icon; }
		if (phase.action !== undefined) { entry.action = phase.action; }
		const steps = phase.steps.map((step) => buildPhaseStepMetadata(step));
		if (steps.length > 0) {
			entry.steps = steps;
		}
		descriptors[phase.id] = entry;
	}
	return descriptors;
}

function buildPhaseStepMetadata(
	step: EngineSessionBaseOptions['phases'][number]['steps'][number],
): SessionPhaseStepMetadata {
	const entry: SessionPhaseStepMetadata = { id: step.id };
	entry.label = step.title ?? formatLabel(step.id);
	if (step.icon) {
		entry.icon = step.icon;
	}
	if (step.triggers && step.triggers.length > 0) {
		entry.triggers = [...step.triggers];
	}
	return entry;
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const descriptors: Record<string, SessionTriggerMetadata> = {};
	for (const [id, info] of Object.entries(TRIGGER_INFO)) {
		const descriptor: SessionTriggerMetadata = {};
		descriptor.icon = info.icon;
		if (info.future) { descriptor.future = info.future; }
		const past = info.past;
		if (past) {
			descriptor.past = past;
			descriptor.label = past;
		} else {
			descriptor.label = formatLabel(id);
		}
		descriptors[id] = descriptor;
	}
	return descriptors;
}

function buildAssetMetadata(): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	const addAsset = (
		key: string,
		info: { icon?: string; label?: string; description?: string } | undefined,
	): void => {
		if (!info) {
			return;
		}
		const descriptor: SessionMetadataDescriptor = {};
		descriptor.label = info.label ?? formatLabel(key);
		if (info.icon) { descriptor.icon = info.icon; }
		if (info.description) { descriptor.description = info.description; }
		descriptors[key] = descriptor;
	};
	addAsset('land', LAND_INFO);
	addAsset('slot', SLOT_INFO);
	addAsset('passive', PASSIVE_INFO);
	return descriptors;
}

function buildOverviewMetadata(): SessionOverviewMetadata | undefined {
	const clone = structuredClone(OVERVIEW_CONTENT);
	const metadata: SessionOverviewMetadata = {};
	if (clone.hero) { metadata.hero = clone.hero; }
	if (clone.sections) { metadata.sections = clone.sections; }
	if (clone.tokens) { metadata.tokens = buildOverviewTokens(clone.tokens); }
	return metadata;
}

function buildOverviewTokens(
	tokens: typeof OVERVIEW_CONTENT.tokens,
): SessionOverviewTokenMap {
	const result: SessionOverviewTokenMap = {};
	for (const [category, record] of Object.entries(tokens)) {
		result[category as keyof SessionOverviewTokenMap] = {
			...record,
		} as Record<string, string[]>;
	}
	return result;
}

function mergeDescriptorRecord<TValue>(
	base: Record<string, TValue> | undefined,
	dynamic: Record<string, TValue> | undefined,
): Record<string, TValue> {
	return {
		...(base ?? {}),
		...(dynamic ?? {}),
	};
}

function mergeOverviewMetadata(
	base: SessionOverviewMetadata | undefined,
	dynamic: SessionOverviewMetadata | undefined,
): SessionOverviewMetadata | undefined {
	if (!base && !dynamic) {
		return undefined;
	}
	const result: SessionOverviewMetadata = {};
	const baseHero = base?.hero;
	const dynamicHero = dynamic?.hero;
	if (baseHero || dynamicHero) {
		result.hero = {
			...(baseHero ?? {}),
			...(dynamicHero ?? {}),
		};
	}
	const sections = dynamic?.sections ?? base?.sections;
	if (sections) {
		result.sections = sections;
	}
	const tokens = mergeOverviewTokens(base?.tokens, dynamic?.tokens);
	if (tokens) {
		result.tokens = tokens;
	}
	return result;
}

function mergeOverviewTokens(
	base: SessionOverviewTokenMap | undefined,
	dynamic: SessionOverviewTokenMap | undefined,
): SessionOverviewTokenMap | undefined {
	if (!base && !dynamic) {
		return undefined;
	}
	const merged: SessionOverviewTokenMap = {};
	const categories = new Set([
		...(base ? Object.keys(base) : []),
		...(dynamic ? Object.keys(dynamic) : []),
	]);
	for (const category of categories) {
		const key = category as keyof SessionOverviewTokenMap;
		const baseRecord = base?.[key];
		const dynamicRecord = dynamic?.[key];
		if (!baseRecord && !dynamicRecord) {
			continue;
		}
		merged[key] = {
			...(baseRecord ?? {}),
			...(dynamicRecord ?? {}),
		};
	}
	return merged;
}

function formatLabel(value: string): string {
	const spaced = value.replace(/[_:-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}
