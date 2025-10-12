import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBuildingRegistry } from '../packages/contents/src/buildings.ts';
import { createDevelopmentRegistry } from '../packages/contents/src/developments.ts';
import { createPopulationRegistry } from '../packages/contents/src/populations.ts';
import { RESOURCES } from '../packages/contents/src/resources.ts';
import { STATS } from '../packages/contents/src/stats.ts';
import { PHASES } from '../packages/contents/src/phases.ts';
import { TRIGGER_INFO } from '../packages/contents/src/triggers.ts';
import { LAND_INFO, SLOT_INFO } from '../packages/contents/src/land.ts';
import { PASSIVE_INFO } from '../packages/contents/src/passive.ts';

const createDescriptor = (
	label?: string,
	icon?: string,
	description?: string,
) => {
	const descriptor: Record<string, string> = {};
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return descriptor;
};

const createRegistryDescriptorMap = <
	TDefinition extends {
		id: string;
		name?: string;
		icon?: string;
		description?: string;
	},
>(registry: {
	entries(): Iterable<[string, TDefinition]>;
}) => {
	const descriptors: Record<string, unknown> = {};
	for (const [id, definition] of registry.entries()) {
		descriptors[id] = createDescriptor(
			definition.name,
			definition.icon,
			definition.description,
		);
	}
	return descriptors;
};

const createResourceDefinitions = () => {
	const record: Record<string, unknown> = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		const entry: Record<string, unknown> = { key };
		if (info.icon !== undefined) {
			entry.icon = info.icon;
		}
		if (info.label !== undefined) {
			entry.label = info.label;
		}
		if (info.description !== undefined) {
			entry.description = info.description;
		}
		if (info.tags && info.tags.length > 0) {
			entry.tags = [...info.tags];
		}
		record[key] = entry;
	}
	return record;
};

const createResourceMetadata = () => {
	const descriptors: Record<string, unknown> = {};
	for (const [key, info] of Object.entries(RESOURCES)) {
		descriptors[key] = createDescriptor(
			info.label,
			info.icon,
			info.description,
		);
	}
	return descriptors;
};

const createStatMetadata = () => {
	const descriptors: Record<string, unknown> = {};
	for (const [key, info] of Object.entries(STATS)) {
		descriptors[key] = createDescriptor(
			info.label,
			info.icon,
			info.description,
		);
	}
	return descriptors;
};

const createPhaseMetadata = () => {
	const phases: Record<string, unknown> = {};
	for (const phase of PHASES) {
		const steps = phase.steps?.map((step) => {
			const baseStep: Record<string, unknown> = {
				id: step.id,
			};
			if (step.title !== undefined) {
				baseStep.label = step.title;
			}
			if (step.icon !== undefined) {
				baseStep.icon = step.icon;
			}
			if (step.triggers && step.triggers.length > 0) {
				baseStep.triggers = [...step.triggers];
			}
			return baseStep;
		});
		const phaseMetadata: Record<string, unknown> = { id: phase.id };
		if (phase.label !== undefined) {
			phaseMetadata.label = phase.label;
		}
		if (phase.icon !== undefined) {
			phaseMetadata.icon = phase.icon;
		}
		if (phase.action !== undefined) {
			phaseMetadata.action = phase.action;
		}
		if (steps && steps.length > 0) {
			phaseMetadata.steps = steps;
		}
		phases[phase.id] = phaseMetadata;
	}
	return phases;
};

const createTriggerMetadata = () => {
	const triggers: Record<string, unknown> = {};
	for (const [key, info] of Object.entries(TRIGGER_INFO)) {
		triggers[key] = {
			label: info.past,
			icon: info.icon,
			future: info.future,
			past: info.past,
		};
	}
	return triggers;
};

const createAssetMetadata = () => ({
	land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
	slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
	passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
});

const resources = createResourceDefinitions();
const buildingRegistry = createBuildingRegistry();
const developmentRegistry = createDevelopmentRegistry();
const populationRegistry = createPopulationRegistry();

const metadata = {
	passiveEvaluationModifiers: {},
	resources: createResourceMetadata(),
	populations: createRegistryDescriptorMap(populationRegistry),
	buildings: createRegistryDescriptorMap(buildingRegistry),
	developments: createRegistryDescriptorMap(developmentRegistry),
	stats: createStatMetadata(),
	phases: createPhaseMetadata(),
	triggers: createTriggerMetadata(),
	assets: createAssetMetadata(),
};

const output = {
	metadata,
	resources,
};

const dest = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../packages/web/src/contexts/defaultRegistryMetadata.json',
);
writeFileSync(dest, JSON.stringify(output, null, 2) + '\n', 'utf8');
