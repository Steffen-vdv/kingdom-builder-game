import type { EngineContext } from '../context';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
	SessionOverviewContent,
} from '@kingdom-builder/protocol/session';
import type { Registry } from '@kingdom-builder/protocol';
import { formatLabel } from '@kingdom-builder/protocol';
import type { PhaseDef, StepDef } from '../phases';

const cloneMetadataDescriptor = (
	label: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor => {
	const descriptor: SessionMetadataDescriptor = { label };
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return descriptor;
};

const buildRegistryDescriptorRecord = <
	Definition extends { id: string; name: string; icon?: string | undefined },
>(
	registry: Registry<Definition>,
): Record<string, SessionMetadataDescriptor> => {
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const [id, definition] of registry.entries()) {
		const descriptor = cloneMetadataDescriptor(
			definition.name,
			definition.icon,
		);
		record[id] = descriptor;
	}
	return record;
};

const cloneDescriptorMap = (
	record: Record<string, SessionMetadataDescriptor> | undefined,
): Map<string, SessionMetadataDescriptor> => {
	const map = new Map<string, SessionMetadataDescriptor>();
	if (!record) {
		return map;
	}
	for (const [key, descriptor] of Object.entries(record)) {
		map.set(key, structuredClone(descriptor));
	}
	return map;
};

const cloneTriggerDescriptorMap = (
	record: Record<string, SessionTriggerMetadata> | undefined,
): Map<string, SessionTriggerMetadata> => {
	const map = new Map<string, SessionTriggerMetadata>();
	if (!record) {
		return map;
	}
	for (const [key, descriptor] of Object.entries(record)) {
		map.set(key, structuredClone(descriptor));
	}
	return map;
};

const buildResourceMetadata = (
	context: EngineContext,
): Record<string, SessionMetadataDescriptor> => {
	const knownDefinitions = cloneDescriptorMap(
		context.registryMetadataSources.resources,
	);
	for (const [key, definition] of Object.entries(
		context.resourceDefinitions ?? {},
	)) {
		const label = definition.label ?? formatLabel(definition.key ?? key);
		const descriptor = cloneMetadataDescriptor(
			label,
			definition.icon,
			definition.description,
		);
		knownDefinitions.set(key, descriptor);
	}
	const resourceKeys = new Set<string>();
	for (const key of knownDefinitions.keys()) {
		resourceKeys.add(key);
	}
	resourceKeys.add(context.actionCostResource);
	const tiered = context.services.rules.tieredResourceKey as
		string | undefined;
	if (tiered) {
		resourceKeys.add(tiered);
	}
	for (const player of context.game.players) {
		for (const key of Object.keys(player.resources)) {
			resourceKeys.add(key);
		}
	}
	for (const compensation of Object.values(context.compensations)) {
		const entries = compensation?.resources ?? {};
		for (const key of Object.keys(entries)) {
			resourceKeys.add(key);
		}
	}
	for (const gain of context.recentResourceGains) {
		resourceKeys.add(gain.key);
	}
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const key of resourceKeys) {
		const base = knownDefinitions.get(key);
		if (base) {
			record[key] = base;
			continue;
		}
		record[key] = cloneMetadataDescriptor(formatLabel(key));
	}
	return record;
};

const buildStatMetadata = (
	context: EngineContext,
): Record<string, SessionMetadataDescriptor> => {
	const knownDefinitions = cloneDescriptorMap(
		context.registryMetadataSources.stats,
	);
	const statKeys = new Set<string>();
	for (const key of knownDefinitions.keys()) {
		statKeys.add(key);
	}
	for (const player of context.game.players) {
		for (const key of Object.keys(player.stats)) {
			statKeys.add(key);
		}
	}
	for (const compensation of Object.values(context.compensations)) {
		const entries = compensation?.stats ?? {};
		for (const key of Object.keys(entries)) {
			statKeys.add(key);
		}
	}
	const record: Record<string, SessionMetadataDescriptor> = {};
	for (const key of statKeys) {
		const base = knownDefinitions.get(key);
		if (base) {
			record[key] = base;
			continue;
		}
		record[key] = cloneMetadataDescriptor(formatLabel(key));
	}
	return record;
};

const clonePhaseStepMetadata = (step: StepDef): SessionPhaseStepMetadata => {
	const metadata: SessionPhaseStepMetadata = { id: step.id };
	if (step.title !== undefined) {
		metadata.label = step.title;
	}
	if (step.icon !== undefined) {
		metadata.icon = step.icon;
	}
	if (step.triggers && step.triggers.length > 0) {
		metadata.triggers = [...step.triggers];
	}
	return metadata;
};

const buildPhaseMetadata = (
	context: EngineContext,
): Record<string, SessionPhaseMetadata> => {
	const record: Record<string, SessionPhaseMetadata> = {};
	for (const phase of context.phases) {
		const steps: SessionPhaseStepMetadata[] = phase.steps.map((step) =>
			clonePhaseStepMetadata(step),
		);
		const metadata: SessionPhaseMetadata = {
			id: phase.id,
			label: phase.label ?? formatLabel(phase.id),
			action: phase.action ?? false,
		};
		if (phase.icon !== undefined) {
			metadata.icon = phase.icon;
		}
		if (steps.length > 0) {
			metadata.steps = steps;
		}
		record[phase.id] = metadata;
	}
	return record;
};

const buildTriggerMetadata = (
	context: EngineContext,
): Record<string, SessionTriggerMetadata> => {
	const map = cloneTriggerDescriptorMap(
		context.registryMetadataSources.triggers,
	);
	const addTrigger = (
		id: string,
		info?: { icon?: string; future?: string; past?: string },
	) => {
		if (map.has(id)) {
			return;
		}
		const label = info?.past ?? info?.future ?? formatLabel(id);
		const descriptor: SessionTriggerMetadata = { label };
		if (info?.icon !== undefined) {
			descriptor.icon = info.icon;
		}
		if (info?.future !== undefined) {
			descriptor.future = info.future;
		}
		if (info?.past !== undefined) {
			descriptor.past = info.past;
		}
		map.set(id, descriptor);
	};
	const collectTriggersFromPhases = (phases: PhaseDef[]) => {
		for (const phase of phases) {
			for (const step of phase.steps) {
				if (!step.triggers) {
					continue;
				}
				for (const triggerId of step.triggers) {
					addTrigger(triggerId);
				}
			}
		}
	};
	collectTriggersFromPhases(context.phases);
	const record: Record<string, SessionTriggerMetadata> = {};
	for (const [id, descriptor] of map.entries()) {
		record[id] = descriptor;
	}
	return record;
};

const buildAssetMetadata = (
	context: EngineContext,
): Record<string, SessionMetadataDescriptor> => {
	const record: Record<string, SessionMetadataDescriptor> = {};
	const baseAssets = context.registryMetadataSources.assets ?? {};
	for (const [key, descriptor] of Object.entries(baseAssets)) {
		record[key] = structuredClone(descriptor);
	}
	const ensureKey = (key: string) => {
		if (record[key]) {
			return;
		}
		record[key] = cloneMetadataDescriptor(formatLabel(key));
	};
	ensureKey('land');
	ensureKey('slot');
	ensureKey('passive');
	return record;
};

const cloneOverviewContent = (
	context: EngineContext,
): SessionOverviewContent => {
	const base = context.registryMetadataSources.overviewContent;
	if (base) {
		return structuredClone(base);
	}
	return {
		hero: {
			badgeIcon: '',
			badgeLabel: '',
			title: '',
			intro: '',
			paragraph: '',
			tokens: {},
		},
		sections: [],
		tokens: {},
	} satisfies SessionOverviewContent;
};

export const buildRegistryMetadata = (
	context: EngineContext,
): Pick<
	SessionSnapshotMetadata,
	| 'resources'
	| 'populations'
	| 'buildings'
	| 'developments'
	| 'stats'
	| 'phases'
	| 'triggers'
	| 'assets'
	| 'overviewContent'
> => ({
	resources: buildResourceMetadata(context),
	populations: buildRegistryDescriptorRecord(context.populations),
	buildings: buildRegistryDescriptorRecord(context.buildings),
	developments: buildRegistryDescriptorRecord(context.developments),
	stats: buildStatMetadata(context),
	phases: buildPhaseMetadata(context),
	triggers: buildTriggerMetadata(context),
	assets: buildAssetMetadata(context),
	overviewContent: cloneOverviewContent(context),
});
