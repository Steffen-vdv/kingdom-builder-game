import type {
	EngineSessionSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

const BASE_PHASES: EngineSessionSnapshot['phases'] = [
	{
		id: 'phase:ascension',
		label: 'Ascension',
		icon: '🛡️',
		action: true,
		steps: [
			{
				id: 'phase:ascension:ignite',
				title: 'Ignition',
				triggers: ['ignite'],
			},
		],
	},
	{
		id: 'phase:restoration',
		steps: [
			{
				id: 'phase:restoration:cleanse',
				title: 'Cleanse',
			},
		],
	},
];

const DEFAULT_RULE_SNAPSHOT: RuleSnapshot = {
	tieredResourceKey: 'happiness',
	tierDefinitions: [
		{
			id: 'tier:steadfast',
			range: { min: 0, max: 3 },
			effect: { incomeMultiplier: 1 },
			text: {
				summary: 'Hold steady and weather unrest.',
				removal: 'Hope falls below the threshold.',
			},
			display: {
				title: 'Steadfast',
				summaryToken: 'tier.steadfast',
			},
		},
		{
			id: 'tier:auric-dawn',
			range: { min: 4 },
			effect: {
				incomeMultiplier: 2,
				growthBonusPct: 25,
			},
			preview: {
				id: 'passive:auric-dawn',
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							key: 'happiness',
							amount: 2,
						},
					},
				],
			},
			text: {
				summary: 'The kingdom basks in auric light.',
				removal: 'Let the light fade to lose the boon.',
			},
			display: {
				title: 'Auric Dawn',
				summaryToken: 'tier.auric',
				icon: '✨',
			},
		},
	],
	winConditions: [
		{
			id: 'win:auric-dawn',
			trigger: {
				type: 'resource',
				key: 'happiness',
				comparison: 'gte',
				value: 10,
				target: 'self',
			},
			result: { subject: 'victory', opponent: 'defeat' },
			display: {
				victory: 'Radiant Triumph',
				defeat: 'Light Extinguished',
			},
		},
	],
};

const clonePhase = (
	phase: EngineSessionSnapshot['phases'][number],
): EngineSessionSnapshot['phases'][number] => ({
	...phase,
	steps: phase.steps?.map((step) => ({
		...step,
		triggers: step.triggers ? [...step.triggers] : undefined,
	})),
});

export function createTestPhases(): EngineSessionSnapshot['phases'] {
	return BASE_PHASES.map(clonePhase);
}

export function createTestRuleSnapshot(
	tieredResourceKey: string,
): RuleSnapshot {
	const base = structuredClone(DEFAULT_RULE_SNAPSHOT);
	base.tieredResourceKey = tieredResourceKey;
	if (base.tierDefinitions[1]?.preview?.effects?.[0]?.params) {
		base.tierDefinitions[1].preview.effects[0].params.key = tieredResourceKey;
	}
	base.winConditions[0]!.trigger.key = tieredResourceKey;
	return base;
}

export function createTestSessionMetadata(
	registries: Pick<
		SessionRegistries,
		'resources' | 'populations' | 'buildings' | 'developments'
	>,
	phases: EngineSessionSnapshot['phases'],
): EngineSessionSnapshot['metadata'] {
	const resourceKeys = Object.keys(registries.resources);
	const primaryResourceKey = resourceKeys[0] ?? 'resource:auric-light';
	const secondaryResourceKey = resourceKeys[1];
	const populationId = registries.populations.keys()[0];
	const buildingEntry = registries.buildings.entries()[0];
	const developmentEntry = registries.developments.entries()[0];
	const firstPhase = phases[0];
	const firstStep = firstPhase?.steps?.[0];
	const metadata: EngineSessionSnapshot['metadata'] = {
		passiveEvaluationModifiers: {},
		resources: {
			[primaryResourceKey]: {
				label: 'Auric Light',
				icon: '💡',
				description: 'Condensed radiance that powers the realm.',
			},
		},
		stats: {
			warWeariness: {
				label: 'War Weariness',
				icon: '😞',
				description: 'Tracks exhaustion from continuous battles.',
			},
			emberCore: {
				label: 'Ember Core',
				icon: '🔥',
			},
		},
		triggers: {
			ignite: {
				label: 'Ignition',
				icon: '🔥',
				future: 'Ignite at dawn',
				past: 'Ignition complete',
			},
		},
		assets: {
			land: { label: 'Territory', icon: '🌍' },
			slot: { label: 'Development Slot', icon: '🧩' },
			passive: { label: 'Aura', icon: '🌀' },
		},
	};
	if (secondaryResourceKey) {
		metadata.resources![secondaryResourceKey] = {
			label: 'Veiled Shadow',
		};
	}
	if (populationId) {
		metadata.populations = {
			[populationId]: {
				label: 'Astral Council',
				icon: '🌠',
				description: 'Guides the flow of celestial power.',
			},
		};
	}
	if (buildingEntry) {
		const [buildingId] = buildingEntry;
		metadata.buildings = {
			[buildingId]: {
				label: 'Sky Bastion Prime',
				icon: '🏯',
				description: 'A fortress raised above the clouds.',
			},
		};
	}
	if (developmentEntry) {
		const [developmentId] = developmentEntry;
		metadata.developments = {
			[developmentId]: {
				label: 'Celestial Garden',
				icon: '🌿',
				description: 'Cultivated under auric illumination.',
			},
		};
	}
	if (firstPhase && firstStep) {
		metadata.phases = {
			[firstPhase.id]: {
				id: firstPhase.id,
				label: 'Ascension',
				icon: '🛡️',
				action: true,
				steps: [
					{
						id: firstStep.id,
						label: 'Ignition',
						icon: '🔥',
						triggers: ['ignite'],
					},
				],
			},
		};
	}
	return metadata;
}
