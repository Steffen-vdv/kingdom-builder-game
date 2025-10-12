import type {
	EngineSessionSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type { HappinessTierDefinition } from '@kingdom-builder/protocol';
import type {
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

const createTierDefinition = (
	id: string,
	options: {
		range: HappinessTierDefinition['range'];
		effect: HappinessTierDefinition['effect'];
		summary: string;
		previewId?: string | undefined;
		icon?: string | undefined;
		removal?: string | undefined;
	},
): HappinessTierDefinition => {
	const tier: HappinessTierDefinition = {
		id,
		range: options.range,
		effect: options.effect,
		text: { summary: options.summary },
		display: {
			summaryToken: `${id}.summary`,
			title: options.summary,
		},
	};
	if (options.icon !== undefined) {
		tier.display = {
			...tier.display,
			icon: options.icon,
		};
	}
	if (options.removal !== undefined) {
		tier.display = {
			...tier.display,
			removalCondition: options.removal,
		};
		tier.text = {
			...tier.text,
			removal: options.removal,
		};
	}
	if (options.previewId) {
		tier.preview = {
			id: options.previewId,
			effects: [
				{
					type: 'stat',
					method: 'add',
					params: { key: 'armyStrength', amount: 1 },
				},
			],
		};
	}
	return tier;
};

const findTieredResourceKey = (
	resources: Record<string, SessionResourceDefinition>,
): string => {
	for (const [key, definition] of Object.entries(resources)) {
		const idMatch = key.toLowerCase().includes('happiness');
		const labelText = definition.label ?? '';
		const labelMatch = labelText.toLowerCase().includes('happiness');
		if (idMatch || labelMatch) {
			return key;
		}
	}
	const [firstKey] = Object.keys(resources);
	return firstKey ?? 'resource-0';
};

export const createTestPhaseSequence = (): EngineSessionSnapshot['phases'] => [
	{
		id: 'growth',
		action: false,
		steps: [
			{
				id: 'growth:start',
				triggers: ['growth:start'],
			},
		],
	},
	{
		id: 'upkeep',
		action: false,
		steps: [
			{
				id: 'upkeep:start',
				triggers: ['upkeep:start'],
			},
		],
	},
	{
		id: 'main',
		action: true,
		steps: [
			{
				id: 'main:action',
				triggers: ['main:turn'],
			},
		],
	},
];

export const createTestRuleSnapshot = (
	resources: Record<string, SessionResourceDefinition>,
): RuleSnapshot => {
	const tieredResourceKey = findTieredResourceKey(resources);
	const tierDefinitions: HappinessTierDefinition[] = [
		createTierDefinition('unrest', {
			range: { min: 0, max: 2 },
			effect: { incomeMultiplier: 0.5 },
			summary: 'Unrest spreads through the realm',
		}),
		createTierDefinition('content', {
			range: { min: 3, max: 6 },
			effect: { incomeMultiplier: 1 },
			summary: 'Citizens remain content',
			previewId: 'passive_content',
		}),
		createTierDefinition('joyous', {
			range: { min: 7 },
			effect: { incomeMultiplier: 1.5 },
			summary: 'Joyous celebrations erupt',
			previewId: 'passive_joyous',
			icon: '🎉',
			removal: 'morale stays elevated',
		}),
	];
	return {
		tieredResourceKey,
		tierDefinitions,
		winConditions: [],
	};
};

export const createTestSessionMetadata = (
	registries: Pick<
		SessionRegistries,
		'populations' | 'buildings' | 'developments' | 'resources'
	>,
	phases: EngineSessionSnapshot['phases'],
): SessionSnapshotMetadata => {
	const tieredResourceKey = findTieredResourceKey(registries.resources);
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources: {
			[tieredResourceKey]: {
				label: 'Morale',
				description: 'Represents happiness tiers.',
			},
		},
		populations: {},
		buildings: {},
		developments: {},
		stats: {
			maxPopulation: { label: 'Population Cap' },
		},
		phases: {},
		assets: {
			passive: { label: 'Passive Effect' },
		},
	};
	for (const [key, definition] of Object.entries(registries.resources)) {
		if (key === tieredResourceKey) {
			continue;
		}
		metadata.resources![key] = { label: definition.label ?? key };
		break;
	}
	const populationEntries = registries.populations.entries();
	const populationEntry =
		populationEntries.length > 0 ? populationEntries[0] : undefined;
	if (populationEntry) {
		const [populationId, definition] = populationEntry;
		metadata.populations![populationId] = {
			label: `${definition.name ?? populationId} Role`,
		};
	}
	const buildingEntries = registries.buildings.entries();
	const buildingEntry =
		buildingEntries.length > 0 ? buildingEntries[0] : undefined;
	if (buildingEntry) {
		const [buildingId, definition] = buildingEntry;
		metadata.buildings![buildingId] = {
			description: `${definition.name ?? buildingId} description`,
		};
	}
	const developmentEntries = registries.developments.entries();
	const developmentEntry =
		developmentEntries.length > 0 ? developmentEntries[0] : undefined;
	if (developmentEntry) {
		const [developmentId, definition] = developmentEntry;
		metadata.developments![developmentId] = {
			label: `${definition.name ?? developmentId} plan`,
		};
	}
	for (const phase of phases) {
		metadata.phases![phase.id] = {
			label: `${phase.id} phase`,
			action: phase.action,
			steps: phase.steps.map((step) => ({ id: step.id })),
		};
	}
	return metadata;
};
