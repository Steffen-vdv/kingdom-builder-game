import {
	RESOURCES,
	STATS,
	POPULATIONS,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	TRIGGER_INFO,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	MODIFIER_INFO,
	OVERVIEW_CONTENT,
	POPULATION_INFO,
	GAME_START,
} from '@kingdom-builder/contents';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
	SessionDeveloperPresetPlan,
	SessionDeveloperPresetPlanEntry,
} from '@kingdom-builder/protocol/session';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';

type MetadataDescriptorRecord = Record<string, SessionMetadataDescriptor>;

type SessionMetadataBundle = Pick<
	SessionSnapshotMetadata,
	| 'resources'
	| 'populations'
	| 'buildings'
	| 'developments'
	| 'stats'
	| 'phases'
	| 'triggers'
	| 'assets'
> & { developerPresetPlan?: SessionDeveloperPresetPlan };

const isNonEmptyString = (value: string | undefined): value is string => {
	return typeof value === 'string' && value.trim().length > 0;
};

const freezeDescriptor = (
	label?: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor => {
	const descriptor: SessionMetadataDescriptor = {};
	if (isNonEmptyString(label)) {
		descriptor.label = label;
	}
	if (isNonEmptyString(icon)) {
		descriptor.icon = icon;
	}
	if (isNonEmptyString(description)) {
		descriptor.description = description;
	}
	return Object.freeze(descriptor);
};

const freezeDescriptorRecord = (
	entries: Iterable<readonly [string, SessionMetadataDescriptor]>,
): MetadataDescriptorRecord => {
	const record = Object.fromEntries(entries);
	return Object.freeze(record) as MetadataDescriptorRecord;
};

const toFiniteNumber = (value: number | undefined): number | undefined => {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return undefined;
	}
	return value;
};

const clonePlanEntries = <TEntry extends Record<string, string | number>>(
	entries: TEntry[],
): TEntry[] => {
	return entries.map((entry) => {
		return { ...entry };
	});
};

const createDeveloperPresetPlanEntry = (
	config: PlayerStartConfig | undefined,
): SessionDeveloperPresetPlanEntry | undefined => {
	if (!config) {
		return undefined;
	}
	const entry: SessionDeveloperPresetPlanEntry = {};
	if (config.resources) {
		const targets: Array<{ key: string; target: number }> = [];
		for (const [key, amount] of Object.entries(config.resources)) {
			const target = toFiniteNumber(amount);
			if (target === undefined) {
				continue;
			}
			targets.push({ key, target });
		}
		if (targets.length > 0) {
			entry.resources = clonePlanEntries(targets);
		}
	}
	if (config.population) {
		const population: Array<{ role: string; count: number }> = [];
		for (const [role, amount] of Object.entries(config.population)) {
			const count = toFiniteNumber(amount);
			if (count === undefined) {
				continue;
			}
			population.push({ role, count });
		}
		if (population.length > 0) {
			entry.population = clonePlanEntries(population);
		}
	}
	if (Array.isArray(config.lands) && config.lands.length > 0) {
		entry.landCount = config.lands.length;
		const developmentIds = new Set<string>();
		for (const land of config.lands) {
			if (!land?.developments) {
				continue;
			}
			for (const id of land.developments) {
				if (typeof id === 'string' && id.trim().length > 0) {
					developmentIds.add(id);
				}
			}
		}
		if (developmentIds.size > 0) {
			entry.developments = [...developmentIds];
		}
	}
	if (Object.keys(entry).length === 0) {
		return undefined;
	}
	return entry;
};

const createDeveloperPresetPlan = ():
	| SessionDeveloperPresetPlan
	| undefined => {
	const devMode = GAME_START.modes?.dev;
	if (!devMode) {
		return undefined;
	}
	const plan: SessionDeveloperPresetPlan = {};
	const baseEntry = createDeveloperPresetPlanEntry(devMode.player);
	if (baseEntry) {
		plan.player = baseEntry;
	}
	if (devMode.players) {
		const entries: Array<readonly [string, SessionDeveloperPresetPlanEntry]> =
			[];
		for (const [playerId, playerConfig] of Object.entries(devMode.players)) {
			const playerEntry = createDeveloperPresetPlanEntry(playerConfig);
			if (!playerEntry) {
				continue;
			}
			entries.push([playerId, playerEntry]);
		}
		if (entries.length > 0) {
			plan.players = Object.fromEntries(entries) as NonNullable<
				SessionDeveloperPresetPlan['players']
			>;
		}
	}
	if (!plan.player && !plan.players) {
		return undefined;
	}
	return plan;
};

const createResourceDescriptors = (): MetadataDescriptorRecord => {
	const entries: Array<readonly [string, SessionMetadataDescriptor]> = [];
	for (const [key, info] of Object.entries(RESOURCES)) {
		entries.push([
			key,
			freezeDescriptor(info.label, info.icon, info.description),
		]);
	}
	return freezeDescriptorRecord(entries);
};

const createRegistryDescriptors = <
	TDefinition extends {
		icon?: string | undefined;
		name?: string | undefined;
	},
>(
	entries: Iterable<readonly [string, TDefinition]>,
): MetadataDescriptorRecord => {
	const descriptors: Array<readonly [string, SessionMetadataDescriptor]> = [];
	for (const [id, definition] of entries) {
		descriptors.push([id, freezeDescriptor(definition.name, definition.icon)]);
	}
	return freezeDescriptorRecord(descriptors);
};

const createStatDescriptors = (): MetadataDescriptorRecord => {
	const entries: Array<readonly [string, SessionMetadataDescriptor]> = [];
	for (const [key, info] of Object.entries(STATS)) {
		entries.push([
			key,
			freezeDescriptor(info.label, info.icon, info.description),
		]);
	}
	return freezeDescriptorRecord(entries);
};

const freezeStepMetadata = (
	step: (typeof PHASES)[number]['steps'][number],
): SessionPhaseStepMetadata => {
	const metadata: SessionPhaseStepMetadata = { id: step.id };
	if (isNonEmptyString(step.title)) {
		metadata.label = step.title;
	}
	if (isNonEmptyString(step.icon)) {
		metadata.icon = step.icon;
	}
	if (Array.isArray(step.triggers) && step.triggers.length > 0) {
		const triggers = Object.freeze([...step.triggers]);
		metadata.triggers = triggers as unknown as string[];
	}
	return Object.freeze(metadata);
};

const createPhaseDescriptors = (): Record<string, SessionPhaseMetadata> => {
	const entries: Array<readonly [string, SessionPhaseMetadata]> = [];
	for (const phase of PHASES) {
		const steps = phase.steps?.map(freezeStepMetadata) ?? [];
		const metadata: SessionPhaseMetadata = { id: phase.id };
		if (isNonEmptyString(phase.label)) {
			metadata.label = phase.label;
		}
		if (isNonEmptyString(phase.icon)) {
			metadata.icon = phase.icon;
		}
		if (phase.action) {
			metadata.action = true;
		}
		if (steps.length > 0) {
			const frozenSteps = Object.freeze(steps);
			metadata.steps = frozenSteps as unknown as SessionPhaseStepMetadata[];
		}
		entries.push([phase.id, Object.freeze(metadata)]);
	}
	const record = Object.fromEntries(entries) as Record<
		string,
		SessionPhaseMetadata
	>;
	return Object.freeze(record);
};

const createTriggerDescriptors = (): Record<string, SessionTriggerMetadata> => {
	const entries: Array<readonly [string, SessionTriggerMetadata]> = [];
	for (const [id, info] of Object.entries(TRIGGER_INFO)) {
		const metadata: SessionTriggerMetadata = {};
		if (isNonEmptyString(info.icon)) {
			metadata.icon = info.icon;
		}
		if (isNonEmptyString(info.future)) {
			metadata.future = info.future;
		}
		if (isNonEmptyString(info.past)) {
			metadata.past = info.past;
			metadata.label = info.past;
		}
		entries.push([id, Object.freeze(metadata)]);
	}
	const record = Object.fromEntries(entries) as Record<
		string,
		SessionTriggerMetadata
	>;
	return Object.freeze(record);
};

const createAssetDescriptors = (): MetadataDescriptorRecord => {
	const upkeep = TRIGGER_INFO.onPayUpkeepStep;
	const overviewHero = OVERVIEW_CONTENT.hero;
	const entries: Array<readonly [string, SessionMetadataDescriptor]> = [
		[
			'population',
			freezeDescriptor(
				POPULATION_INFO.label,
				POPULATION_INFO.icon,
				POPULATION_INFO.description,
			),
		],
		['land', freezeDescriptor(LAND_INFO.label, LAND_INFO.icon)],
		['slot', freezeDescriptor(SLOT_INFO.label, SLOT_INFO.icon)],
		['passive', freezeDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon)],
		[
			'upkeep',
			freezeDescriptor(upkeep?.past ?? 'Upkeep', upkeep?.icon, upkeep?.future),
		],
		[
			'modifierCost',
			freezeDescriptor(MODIFIER_INFO.cost.label, MODIFIER_INFO.cost.icon),
		],
		[
			'modifierResult',
			freezeDescriptor(MODIFIER_INFO.result.label, MODIFIER_INFO.result.icon),
		],
		[
			'overview',
			freezeDescriptor(
				overviewHero.title,
				overviewHero.badgeIcon,
				overviewHero.intro,
			),
		],
	];
	return freezeDescriptorRecord(entries);
};

export function buildSessionMetadata(): SessionMetadataBundle {
	const metadata: SessionMetadataBundle = {
		resources: createResourceDescriptors(),
		populations: createRegistryDescriptors(POPULATIONS.entries()),
		buildings: createRegistryDescriptors(BUILDINGS.entries()),
		developments: createRegistryDescriptors(DEVELOPMENTS.entries()),
		stats: createStatDescriptors(),
		phases: createPhaseDescriptors(),
		triggers: createTriggerDescriptors(),
		assets: createAssetDescriptors(),
	};
	const developerPresetPlan = createDeveloperPresetPlan();
	if (developerPresetPlan) {
		metadata.developerPresetPlan = developerPresetPlan;
	}
	return Object.freeze(metadata);
}
