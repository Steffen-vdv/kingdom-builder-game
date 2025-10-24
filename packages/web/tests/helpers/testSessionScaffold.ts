import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionResourceCatalogV2,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import { createSessionRegistries } from './sessionRegistries';
import { createEmptySnapshotMetadata } from './sessionFixtures';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createResourceV2CatalogFixture } from './resourceV2CatalogFixture';

interface PhaseOrderEntry {
	id: string;
	metadata: SessionPhaseMetadata;
}

const TIER_PASSIVE_ID = 'tier.joyous.passive';
const NEUTRAL_TIER_ID = 'tier.neutral';

const PHASE_ORDER: readonly PhaseOrderEntry[] = Object.freeze([
	{
		id: 'phase.growth',
		metadata: {
			id: 'phase.growth',
			label: 'Growth Phase',
			icon: '🌱',
			steps: [
				{
					id: 'phase.growth.collect',
					label: 'Collect Growth',
					icon: '🪴',
					triggers: ['trigger.growth.start'],
				},
				{
					id: 'phase.growth.resolve',
					triggers: ['trigger.growth.resolve'],
				},
			],
		},
	},
	{
		id: 'phase.action',
		metadata: {
			id: 'phase.action',
			label: 'Action Phase',
			icon: '⚔️',
			action: true,
			steps: [
				{
					id: 'phase.action.perform',
					label: 'Perform Actions',
				},
			],
		},
	},
	{
		id: 'phase.upkeep',
		metadata: {
			id: 'phase.upkeep',
			label: 'Upkeep Phase',
			steps: [
				{
					id: 'phase.upkeep.clean',
					triggers: ['trigger.upkeep.clean'],
				},
			],
		},
	},
]);

const TRIGGER_METADATA: Readonly<Record<string, SessionTriggerMetadata>> =
	Object.freeze({
		'trigger.growth.start': {
			icon: '🌿',
			past: 'Growth Triggered',
			future: 'At the start of Growth',
		},
		'trigger.growth.resolve': {
			past: 'Growth Resolved',
		},
		'trigger.upkeep.clean': {
			icon: '🧹',
			past: 'Upkeep',
			future: 'During Upkeep',
		},
	});

const ASSET_METADATA: Readonly<Record<string, SessionMetadataDescriptor>> =
	Object.freeze({
		passive: {
			icon: '♾️',
			label: 'Passive Effect',
			description: 'Always-on bonuses that shape your realm.',
		},
		population: {
			icon: '👥',
			label: 'Population',
			description: 'Track population roles and assignments.',
		},
		land: {
			icon: '🛤️',
			label: 'Frontier Land',
			description: 'Represents territory under your control.',
		},
		slot: {
			icon: '🧩',
			label: 'Development Slot',
			description: 'Install new structures by filling available slots.',
		},
		upkeep: {
			icon: '🧽',
			label: 'Maintenance',
			description: 'Costs paid each upkeep phase to retain benefits.',
		},
		transfer: {
			icon: '🔁',
			label: 'Transfer',
			description: 'Movement of resources or assets between owners.',
		},
	});

export interface TestSessionScaffold {
	registries: SessionRegistries;
	metadata: SessionSnapshot['metadata'];
	phases: SessionSnapshot['phases'];
	ruleSnapshot: SessionRuleSnapshot;
	tierPassiveId: string;
	neutralTierId: string;
	resourceCatalogV2: SessionResourceCatalogV2;
	resourceMetadataV2: Record<string, SessionMetadataDescriptor>;
	resourceGroupMetadataV2: Record<string, SessionMetadataDescriptor>;
}

const buildResourceMetadata = (
	registries: SessionRegistries,
): Record<string, SessionMetadataDescriptor> => {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	const resourceKeys = Object.keys(registries.resources);
	const missingIconKey =
		resourceKeys[resourceKeys.length - 1] ?? resourceKeys[0] ?? 'resource-0';
	const missingIconDefinition = registries.resources[missingIconKey];
	if (missingIconDefinition) {
		const clone = { ...missingIconDefinition };
		delete clone.icon;
		registries.resources[missingIconKey] = clone;
	}
	for (const [index, key] of resourceKeys.entries()) {
		const descriptor: SessionMetadataDescriptor = {
			label: `Resource ${index + 1}`,
		};
		if (index === 0) {
			descriptor.icon = '🧪';
			descriptor.description = 'Primary resource descriptor.';
		} else if (index % 2 === 0) {
			descriptor.description = `Descriptor for ${key}.`;
		}
		descriptors[key] = descriptor;
	}
	return descriptors;
};

const buildPopulationMetadata = (
	registries: SessionRegistries,
): Record<string, SessionMetadataDescriptor> => {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	let index = 0;
	for (const id of registries.populations.keys()) {
		const descriptor: SessionMetadataDescriptor = {
			label: `Role ${index + 1}`,
		};
		if (index === 0) {
			descriptor.icon = '🛡️';
		}
		descriptors[id] = descriptor;
		index += 1;
	}
	return descriptors;
};

const buildStatMetadata = (): Record<string, SessionMetadataDescriptor> => ({
	maxPopulation: {
		icon: '👥',
		label: 'Max Population',
		description: 'Determines how many specialists the realm can sustain.',
		format: { prefix: 'Max ' },
	},
	armyStrength: {
		icon: '⚔️',
		label: 'Army Strength',
		description: 'Measures combat readiness.',
	},
	fortificationStrength: {
		icon: '🛡️',
		label: 'Fortification Strength',
		description: 'Determines defensive strength.',
	},
	absorption: {
		icon: '🌀',
		label: 'Absorption',
		description: 'Reduces incoming damage by a percentage.',
		displayAsPercent: true,
		format: { percent: true },
	},
	growth: {
		icon: '🌿',
		label: 'Growth Rate',
		description: 'Improves how quickly strength stats increase.',
		displayAsPercent: true,
		format: { percent: true },
	},
	warWeariness: {
		icon: '💤',
		label: 'War Weariness',
		description: 'Tracks fatigue from protracted conflict.',
	},
});

export function createTestSessionScaffold(): TestSessionScaffold {
	const registries = createSessionRegistries();
	const resourceKeys = Object.keys(registries.resources);
	const resourceMetadata = buildResourceMetadata(registries);
	const populationMetadata = buildPopulationMetadata(registries);
	const statMetadata = buildStatMetadata();
	const phaseMetadata = buildPhaseMetadata();
	const {
		catalog: resourceCatalogV2,
		metadata: resourceMetadataV2,
		groupMetadata: resourceGroupMetadataV2,
	} = createResourceV2CatalogFixture();
	const metadata: SessionSnapshot['metadata'] = createEmptySnapshotMetadata({
		resources: resourceMetadata,
		populations: populationMetadata,
		stats: statMetadata,
		phases: phaseMetadata,
		triggers: { ...TRIGGER_METADATA },
		assets: { ...ASSET_METADATA },
		resourcesV2: resourceMetadataV2,
		resourceGroupsV2: resourceGroupMetadataV2,
		overviewContent: {
			hero: { title: 'Session Overview', tokens: {} },
			sections: [],
			tokens: {},
		},
	});
	const phases = buildPhaseDefinitions(PHASE_ORDER);
	const tieredResourceKey = resourceKeys[0] ?? 'resource-0';
	const ruleSnapshot = buildRuleSnapshot(tieredResourceKey);
	return {
		registries,
		metadata,
		phases,
		ruleSnapshot,
		tierPassiveId: TIER_PASSIVE_ID,
		neutralTierId: NEUTRAL_TIER_ID,
		resourceCatalogV2,
		resourceMetadataV2,
		resourceGroupMetadataV2,
	};
}
