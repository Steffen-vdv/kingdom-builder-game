import type { EngineSession } from '@kingdom-builder/engine';
import {
	DEVELOPMENTS_INFO,
	LAND_INFO,
	PASSIVE_INFO,
	POPULATION_INFO,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
	type PhaseDef,
} from '@kingdom-builder/contents';
import type {
	SessionEffectLogMap,
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionRegistriesPayload,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
	SessionPassiveEvaluationModifierMap,
} from '@kingdom-builder/protocol';

type DescriptorInfo = {
	icon?: string | undefined;
	label?: string | undefined;
	name?: string | undefined;
	description?: string | undefined;
};

type TriggerInfo = {
	icon?: string | undefined;
	future?: string | undefined;
	past?: string | undefined;
};

type PhaseStep = PhaseDef['steps'][number];

export function createBaseSessionMetadata(
	registries: Pick<
		SessionRegistriesPayload,
		'buildings' | 'developments' | 'populations' | 'resources'
	>,
	phases: readonly PhaseDef[],
): Readonly<SessionSnapshotMetadata> {
	const resources = buildResourceMetadata(registries.resources);
	const populations = buildDefinitionMetadata(registries.populations);
	const buildings = buildDefinitionMetadata(registries.buildings);
	const developments = buildDefinitionMetadata(registries.developments);
	const stats = buildStatMetadata();
	const phaseMetadata = buildPhaseMetadata(phases);
	const triggers = buildTriggerMetadata();
	const assets = buildAssetMetadata();
	return Object.freeze({
		passiveEvaluationModifiers: Object.freeze(
			{},
		) as SessionPassiveEvaluationModifierMap,
		resources,
		populations,
		buildings,
		developments,
		stats,
		phases: phaseMetadata,
		triggers,
		assets,
	});
}

export function composeSessionSnapshot(
	session: EngineSession,
	baseMetadata: Readonly<SessionSnapshotMetadata>,
): SessionSnapshot {
	const snapshot = session.getSnapshot();
	const metadata = mergeSessionMetadata(baseMetadata, snapshot.metadata);
	return {
		...snapshot,
		metadata,
	};
}

export function mergeSessionMetadata(
	baseMetadata: Readonly<SessionSnapshotMetadata>,
	metadata: SessionSnapshotMetadata,
): SessionSnapshotMetadata {
	const effectLogs =
		metadata.effectLogs && cloneEffectLogs(metadata.effectLogs);
	const passiveEvaluationModifiers = cloneEvaluationModifiers(
		metadata.passiveEvaluationModifiers,
	);
	const resources = mergeDescriptorRecord(
		baseMetadata.resources,
		metadata.resources,
	);
	const populations = mergeDescriptorRecord(
		baseMetadata.populations,
		metadata.populations,
	);
	const buildings = mergeDescriptorRecord(
		baseMetadata.buildings,
		metadata.buildings,
	);
	const developments = mergeDescriptorRecord(
		baseMetadata.developments,
		metadata.developments,
	);
	const stats = mergeDescriptorRecord(baseMetadata.stats, metadata.stats);
	const phases = mergePhaseMetadata(baseMetadata.phases, metadata.phases);
	const triggers = mergeTriggerMetadata(
		baseMetadata.triggers,
		metadata.triggers,
	);
	const assets = mergeDescriptorRecord(baseMetadata.assets, metadata.assets);
	const merged: SessionSnapshotMetadata = {
		passiveEvaluationModifiers,
	};
	assignSnapshotRecord(merged, 'resources', baseMetadata.resources, resources);
	assignSnapshotRecord(
		merged,
		'populations',
		baseMetadata.populations,
		populations,
	);
	assignSnapshotRecord(merged, 'buildings', baseMetadata.buildings, buildings);
	assignSnapshotRecord(
		merged,
		'developments',
		baseMetadata.developments,
		developments,
	);
	assignSnapshotRecord(merged, 'stats', baseMetadata.stats, stats);
	assignSnapshotRecord(merged, 'phases', baseMetadata.phases, phases);
	assignSnapshotRecord(merged, 'triggers', baseMetadata.triggers, triggers);
	assignSnapshotRecord(merged, 'assets', baseMetadata.assets, assets);
	if (baseMetadata.effectLogs) {
		merged.effectLogs = baseMetadata.effectLogs;
	}
	if (effectLogs) {
		merged.effectLogs = effectLogs;
	}
	return Object.freeze(merged);
}

function cloneEffectLogs(effectLogs: SessionEffectLogMap): SessionEffectLogMap {
	return mapFrozenRecord(effectLogs, (value) =>
		Object.freeze(structuredClone(value)),
	) as SessionEffectLogMap;
}

function cloneEvaluationModifiers(
	modifiers: SessionPassiveEvaluationModifierMap,
): SessionPassiveEvaluationModifierMap {
	return mapFrozenRecord(modifiers, (value) =>
		Object.freeze(structuredClone(value)),
	) as SessionPassiveEvaluationModifierMap;
}

function mergeDescriptorRecord(
	base: Readonly<Record<string, SessionMetadataDescriptor>> | undefined,
	overrides?: Record<string, SessionMetadataDescriptor>,
): Record<string, SessionMetadataDescriptor> | undefined {
	return mergeFrozenRecord(
		base,
		overrides,
		(descriptor) =>
			Object.freeze(structuredClone(descriptor)) as SessionMetadataDescriptor,
	);
}

function mergePhaseMetadata(
	base: Readonly<Record<string, SessionPhaseMetadata>> | undefined,
	overrides?: Record<string, SessionPhaseMetadata>,
): Record<string, SessionPhaseMetadata> | undefined {
	return mergeFrozenRecord(
		base,
		overrides,
		(metadata) =>
			Object.freeze(structuredClone(metadata)) as SessionPhaseMetadata,
	);
}

function mergeTriggerMetadata(
	base: Readonly<Record<string, SessionTriggerMetadata>> | undefined,
	overrides?: Record<string, SessionTriggerMetadata>,
): Record<string, SessionTriggerMetadata> | undefined {
	return mergeFrozenRecord(
		base,
		overrides,
		(metadata) =>
			Object.freeze(structuredClone(metadata)) as SessionTriggerMetadata,
	);
}

function buildResourceMetadata(
	resources: SessionRegistriesPayload['resources'],
): Record<string, SessionMetadataDescriptor> {
	return mapFrozenRecord(resources, (info) => createDescriptor(info));
}

function buildDefinitionMetadata(
	definitions: Record<string, DescriptorInfo>,
): Record<string, SessionMetadataDescriptor> {
	return mapFrozenRecord(definitions, (definition) =>
		createDescriptor(definition, 'name'),
	);
}

function buildStatMetadata(): Record<string, SessionMetadataDescriptor> {
	return mapFrozenRecord(STATS, (info) => createDescriptor(info));
}

function buildPhaseMetadata(
	phases: readonly PhaseDef[],
): Record<string, SessionPhaseMetadata> {
	const entries: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const steps =
			phase.steps.length > 0
				? (Object.freeze(
						phase.steps.map((step) => createPhaseStepMetadata(step)),
					) as SessionPhaseStepMetadata[])
				: undefined;
		const descriptor = {
			id: phase.id,
			...(phase.label !== undefined ? { label: phase.label } : {}),
			...(phase.icon !== undefined ? { icon: phase.icon } : {}),
			...(phase.action !== undefined ? { action: phase.action } : {}),
			...(steps !== undefined ? { steps } : {}),
		} satisfies SessionPhaseMetadata;
		entries[phase.id] = Object.freeze(descriptor) as SessionPhaseMetadata;
	}
	return Object.freeze(entries) as Record<string, SessionPhaseMetadata>;
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	return mapFrozenRecord(TRIGGER_INFO as Record<string, TriggerInfo>, (info) =>
		createTriggerDescriptor(info),
	);
}

function buildAssetMetadata(): Record<string, SessionMetadataDescriptor> {
	const entries: Record<string, SessionMetadataDescriptor> = {};
	const register = (key: string, info: DescriptorInfo | undefined): void => {
		if (!info) {
			return;
		}
		entries[key] = createDescriptor(info);
	};
	register('population', POPULATION_INFO);
	register('land', LAND_INFO);
	register('slot', SLOT_INFO);
	register('passive', PASSIVE_INFO);
	register('developments', DEVELOPMENTS_INFO);
	const upkeepInfo = TRIGGER_INFO.onPayUpkeepStep;
	if (upkeepInfo) {
		register('upkeep', {
			icon: upkeepInfo.icon,
			label: upkeepInfo.past,
			description: upkeepInfo.future,
		});
	}
	return Object.freeze(entries) as Record<string, SessionMetadataDescriptor>;
}

function createDescriptor(
	info: DescriptorInfo,
	labelProperty: 'label' | 'name' = 'label',
): SessionMetadataDescriptor {
	const label = labelProperty === 'name' ? info.name : info.label;
	const descriptor = {
		...(info.icon !== undefined ? { icon: info.icon } : {}),
		...(label !== undefined ? { label } : {}),
		...(info.description !== undefined
			? { description: info.description }
			: {}),
	} satisfies SessionMetadataDescriptor;
	return Object.freeze(descriptor) as SessionMetadataDescriptor;
}

function createTriggerDescriptor(info: TriggerInfo): SessionTriggerMetadata {
	const descriptor = {
		...(info.icon !== undefined ? { icon: info.icon } : {}),
		...(info.future !== undefined ? { future: info.future } : {}),
		...(info.past !== undefined ? { past: info.past, label: info.past } : {}),
	} satisfies SessionTriggerMetadata;
	return Object.freeze(descriptor) as SessionTriggerMetadata;
}

function createPhaseStepMetadata(step: PhaseStep): SessionPhaseStepMetadata {
	const descriptor = {
		id: step.id,
		...(step.title !== undefined ? { label: step.title } : {}),
		...(step.icon !== undefined ? { icon: step.icon } : {}),
		...(step.triggers ? { triggers: structuredClone(step.triggers) } : {}),
	} satisfies SessionPhaseStepMetadata;
	return Object.freeze(descriptor) as SessionPhaseStepMetadata;
}

type SnapshotRecordKey =
	| 'resources'
	| 'populations'
	| 'buildings'
	| 'developments'
	| 'stats'
	| 'phases'
	| 'triggers'
	| 'assets';

function assignSnapshotRecord<Key extends SnapshotRecordKey>(
	target: SessionSnapshotMetadata,
	key: Key,
	baseValue: SessionSnapshotMetadata[Key],
	override: SessionSnapshotMetadata[Key],
): void {
	if (override || baseValue) {
		target[key] = (override ?? baseValue)!;
	}
}

function mapFrozenRecord<Input, Output>(
	source: Record<string, Input> | Readonly<Record<string, Input>>,
	projector: (value: Input, key: string) => Output,
): Record<string, Output> {
	const entries: Record<string, Output> = {};
	for (const [key, value] of Object.entries(source)) {
		entries[key] = projector(value, key);
	}
	return Object.freeze(entries) as Record<string, Output>;
}

function mergeFrozenRecord<T>(
	base: Readonly<Record<string, T>> | undefined,
	overrides: Record<string, T> | undefined,
	clone: (value: T) => T,
): Record<string, T> | undefined {
	if (!base && !overrides) {
		return undefined;
	}
	if (!overrides) {
		return base as Record<string, T>;
	}
	const entries: Record<string, T> = {};
	if (base) {
		Object.assign(entries, base);
	}
	for (const [key, value] of Object.entries(overrides)) {
		entries[key] = clone(value);
	}
	return Object.freeze(entries) as Record<string, T>;
}
