import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	SessionPassiveRecordSnapshot,
	SessionPlayerId,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import {
	createEmptySnapshotMetadata,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

export const ON_UPKEEP_PHASE = 'onUpkeepPhase';

export const SYNTHETIC_RESOURCES = Object.freeze({
	actionPoints: Object.freeze({
		id: 'resource:synthetic:ap',
		icon: '🛠️',
		label: 'Synthetic Action Points',
	}),
	happiness: Object.freeze({
		id: 'resource:synthetic:happiness',
		icon: '🎊',
		label: 'Synthetic Happiness',
	}),
});

export type SyntheticResourceId =
	(typeof SYNTHETIC_RESOURCES)[keyof typeof SYNTHETIC_RESOURCES]['id'];

export const RESOURCE_LOOKUP = Object.freeze(
	Object.fromEntries(
		Object.values(SYNTHETIC_RESOURCES).map((resource) => [
			resource.id,
			{ icon: resource.icon, label: resource.label },
		]),
	),
);

export const FORTIFICATION_STAT_KEY = 'fortificationStrength';

export const SYNTHETIC_PHASES: SessionSnapshot['phases'] = [
	{
		id: 'phase:synthetic:main',
		label: 'Celebration',
		icon: '🎪',
		action: true,
		steps: [
			{
				id: 'step:synthetic:main:start',
				title: 'Begin Festivities',
			},
		],
	},
	{
		id: 'phase:synthetic:rest',
		label: 'Well-Earned Rest',
		icon: '🛌',
		steps: [
			{
				id: 'step:synthetic:rest',
				title: 'Recover',
				triggers: [ON_UPKEEP_PHASE],
			},
		],
	},
];

export const FALLBACK_UPKEEP = Object.freeze({
	icon: '🧹',
	label: 'Upkeep',
});

export const SYNTHETIC_RESULT_MODIFIER = Object.freeze({
	icon: '✨',
	label: 'Outcome Adjustment',
});

export const buildFestivalRuleSnapshot = (
	tierResourceKey: string,
): SessionRuleSnapshot => ({
	tieredResourceKey: tierResourceKey,
	tierDefinitions: [],
	winConditions: [],
});

export const createFestivalMetadata = (): SessionSnapshotMetadata =>
	createEmptySnapshotMetadata({
		assets: {
			passive: SYNTHETIC_RESULT_MODIFIER,
			upkeep: FALLBACK_UPKEEP,
		},
		resources: {
			...RESOURCE_LOOKUP,
			[SYNTHETIC_RESOURCES.actionPoints.id]: {
				icon: SYNTHETIC_RESOURCES.actionPoints.icon,
				label: SYNTHETIC_RESOURCES.actionPoints.label,
			},
			[SYNTHETIC_RESOURCES.happiness.id]: {
				icon: SYNTHETIC_RESOURCES.happiness.icon,
				label: SYNTHETIC_RESOURCES.happiness.label,
			},
			[FORTIFICATION_STAT_KEY]: {
				icon: '🛡️',
				label: 'Fortification Strength',
			},
		},
		stats: {
			[FORTIFICATION_STAT_KEY]: {
				icon: '🛡️',
				label: 'Fortification Strength',
				description: 'Determines defensive strength.',
			},
		},
		triggers: {
			[ON_UPKEEP_PHASE]: {
				icon: FALLBACK_UPKEEP.icon,
				future: `During ${FALLBACK_UPKEEP.label}`,
				past: FALLBACK_UPKEEP.label,
			},
		},
	});

export const buildFestivalPassiveRecord = (
	owner: SessionPlayerId,
	passiveId: string,
	icon: string,
	upkeepEffect: EffectDef,
): SessionPassiveRecordSnapshot => ({
	id: passiveId,
	owner,
	name: 'Festival Hangover',
	icon,
	meta: { source: { icon } },
	onUpkeepPhase: [upkeepEffect],
});

export const createFestivalPlayers = (
	resourceBase: Record<string, number>,
): [
	ReturnType<typeof createSnapshotPlayer>,
	ReturnType<typeof createSnapshotPlayer>,
] => {
	const activeResources = { ...resourceBase };
	const opponentResources = { ...resourceBase };
	activeResources[SYNTHETIC_RESOURCES.actionPoints.id] = 3;
	const active = createSnapshotPlayer({
		id: 'player:synthetic:active' as SessionPlayerId,
		name: 'Festival Advocate',
		resources: activeResources,
		stats: { [FORTIFICATION_STAT_KEY]: 5 },
	});
	const opponent = createSnapshotPlayer({
		id: 'player:synthetic:opponent' as SessionPlayerId,
		name: 'Festival Observer',
		resources: opponentResources,
	});
	return [active, opponent];
};
