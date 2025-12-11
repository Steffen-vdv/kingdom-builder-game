import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import {
	createSessionRegistries,
	createResourceCatalogContent,
} from './sessionRegistries';
import { createEmptySnapshotMetadata } from './sessionFixtures';
import { buildResourceMetadata } from './testResourceMetadata';

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
			label: 'Growth Start',
			text: 'At the start of Growth',
		},
		'trigger.growth.resolve': {
			label: 'Growth Resolved',
			text: 'Growth Resolved',
		},
		'trigger.upkeep.clean': {
			icon: '🧹',
			label: 'Upkeep',
			text: 'During Upkeep',
		},
		// Triggers used in session registries payload (buildings/developments)
		onBuild: {
			icon: '⚒️',
			label: 'Build',
			text: 'On build',
			condition: 'Until removed',
		},
		onGainIncomeStep: {
			icon: '💰',
			label: 'Gain Income',
			text: 'Gain Income',
		},
		onPayUpkeepStep: {
			icon: '🧹',
			label: 'Upkeep',
			text: 'On your Upkeep step',
		},
		onGainAPStep: {
			icon: '⚡',
			label: 'AP',
			text: 'On your AP step',
		},
		onAttackResolved: {
			icon: '⚔️',
			label: 'Attack Resolved',
			text: 'After having been attacked',
		},
		onDamage: {
			icon: '💥',
			label: 'Damage',
			text: 'When damage is dealt',
		},
		// Phase triggers used in phased translation tests
		'onPhase.growthPhase': {
			icon: '🌱',
			label: 'Growth Phase',
			text: 'On your Growth Phase',
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
			icon: '🧺🔁',
			label: 'Resource Transfer',
			description: 'Movement of resources or assets between owners.',
		},
		action: {
			icon: '🎯',
			label: 'Action',
			plural: 'Actions',
		},
		development: {
			icon: '🏗️',
			label: 'Development',
			plural: 'Developments',
		},
		modifiers: {
			cost: { icon: '✨', label: 'Cost Adjustment' },
			result: { icon: '✨', label: 'Outcome Adjustment' },
		},
		keywords: {
			resourceGain: 'Resource Gain',
			cost: 'Cost',
		},
	});

export interface TestSessionScaffold {
	registries: SessionRegistries;
	metadata: SessionSnapshot['metadata'];
	phases: SessionSnapshot['phases'];
	ruleSnapshot: SessionRuleSnapshot;
	tierPassiveId: string;
	neutralTierId: string;
	resourceCatalog: ReturnType<typeof createResourceCatalogContent>;
}

const buildPhaseDefinitions = (
	entries: readonly PhaseOrderEntry[],
): SessionSnapshot['phases'] =>
	entries.map(({ id, metadata }) => ({
		id,
		label: metadata.label,
		icon: metadata.icon,
		action: metadata.action ?? false,
		steps: (metadata.steps ?? []).map((step) => ({
			id: step.id,
			title: step.label,
			icon: step.icon,
			triggers: step.triggers,
		})),
	}));

const buildPhaseMetadata = (): Record<string, SessionPhaseMetadata> => {
	const descriptors: Record<string, SessionPhaseMetadata> = {};
	for (const entry of PHASE_ORDER) {
		descriptors[entry.id] = entry.metadata;
	}
	return descriptors;
};

const buildRuleSnapshot = (resourceKey: string): SessionRuleSnapshot => ({
	tieredResourceKey: resourceKey,
	tierDefinitions: [
		{
			id: 'tier.joyous',
			range: { min: 0, max: 3 },
			effect: { incomeMultiplier: 1 },
			preview: {
				id: TIER_PASSIVE_ID,
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: resourceKey,
							change: { type: 'amount', amount: 1 },
						},
					},
				],
			},
			text: {
				summary: 'Gain a steady stream of happiness.',
				removal: 'Joy fades from the realm.',
			},
			display: {
				title: 'Joyous Celebration',
				icon: '🎉',
				summaryToken: 'tier.joyous.summary',
				removalCondition: 'Population remains joyful.',
			},
		},
		{
			id: NEUTRAL_TIER_ID,
			range: { min: 4 },
			effect: { incomeMultiplier: 1 },
			text: {
				summary: 'Hold the line without bonuses.',
				removal: 'Stability crumbles.',
			},
			display: {
				title: 'Steady Resolve',
				summaryToken: 'tier.neutral.summary',
			},
		},
	],
	winConditions: [],
});

export function createTestSessionScaffold(): TestSessionScaffold {
	const registries = createSessionRegistries();
	const resourceMetadata = buildResourceMetadata();
	const phaseMetadata = buildPhaseMetadata();
	const metadata: SessionSnapshot['metadata'] = createEmptySnapshotMetadata({
		resources: resourceMetadata,
		phases: phaseMetadata,
		triggers: { ...TRIGGER_METADATA },
		assets: { ...ASSET_METADATA },
		overviewContent: {
			hero: { title: 'Session Overview', tokens: {} },
			sections: [],
			tokens: {},
		},
	});
	const phases = buildPhaseDefinitions(PHASE_ORDER);
	const resourceCatalog = createResourceCatalogContent();
	// Use Resource key for tieredResourceKey - happiness is the canonical
	// tiered resource in the test fixtures
	const tieredResourceKey =
		Object.keys(resourceCatalog.resources.byId).find((key) =>
			key.includes('happiness'),
		) ?? 'resource:core:happiness';
	const ruleSnapshot = buildRuleSnapshot(tieredResourceKey);
	return {
		registries,
		metadata,
		phases,
		ruleSnapshot,
		tierPassiveId: TIER_PASSIVE_ID,
		neutralTierId: NEUTRAL_TIER_ID,
		resourceCatalog,
	};
}
