import {
	effect,
	attackParams,
	resourceParams,
	transferParams,
	statParams,
} from '@kingdom-builder/contents/config/builders';
import {
	Types,
	ResourceMethods,
	ActionMethods,
	StatMethods,
} from '@kingdom-builder/contents/config/builderShared';
import {
	Resource as ContentResource,
	Stat as ContentStat,
	type StatKey,
} from '@kingdom-builder/contents';
import type { SyntheticAction, CombatStatKey } from './armyAttackConfig';
import {
	SYNTH_ATTACK,
	SYNTH_PLUNDER,
	SYNTH_BUILDING_ATTACK,
	SYNTH_PARTIAL_ATTACK,
	SYNTH_BUILDING,
	COMBAT_STAT_CONFIG,
	ATTACKER_HAPPINESS_GAIN,
	DEFENDER_HAPPINESS_LOSS,
	WAR_WEARINESS_GAIN,
	BUILDING_REWARD_GOLD,
	PLUNDER_PERCENT,
} from './armyAttackConfig';

export type ResourceEffectDescriptor = {
	kind: 'resource';
	method: ResourceMethods;
	key: ContentResource;
	amount?: number;
	percent?: number;
};

export type ActionEffectDescriptor = {
	kind: 'action';
	id: string;
};

export type StatEffectDescriptor = {
	kind: 'stat';
	key: ContentStat;
	amount: number;
};

export type EffectDescriptor =
	| ResourceEffectDescriptor
	| ActionEffectDescriptor
	| StatEffectDescriptor;

export type AttackEffectDescriptor = {
	target: { resource?: ContentResource; building?: string };
	attacker?: EffectDescriptor[];
	defender?: EffectDescriptor[];
	stats?: CombatStatKey[];
};

export type ActionDefinition = {
	meta: SyntheticAction;
	baseCosts?: Record<string, number>;
	attack?: AttackEffectDescriptor;
	extra?: EffectDescriptor[];
	system?: boolean;
};

function statKey(key: keyof typeof COMBAT_STAT_CONFIG): StatKey {
	return COMBAT_STAT_CONFIG[key].key as unknown as StatKey;
}

function buildResourceEffect(descriptor: ResourceEffectDescriptor) {
	if (descriptor.method === ResourceMethods.TRANSFER) {
		return effect(Types.Resource, descriptor.method)
			.params(
				transferParams()
					.key(descriptor.key)
					.percent(descriptor.percent ?? 0),
			)
			.build();
	}
	return effect(Types.Resource, descriptor.method)
		.params(
			resourceParams()
				.key(descriptor.key)
				.amount(descriptor.amount ?? 0),
		)
		.build();
}

function buildActionEffect(descriptor: ActionEffectDescriptor) {
	return effect(Types.Action, ActionMethods.PERFORM)
		.param('id', descriptor.id)
		.build();
}

function buildStatEffect(descriptor: StatEffectDescriptor) {
	return effect(Types.Stat, StatMethods.ADD)
		.params(statParams().key(descriptor.key).amount(descriptor.amount))
		.build();
}

export function buildEffects(descriptors: EffectDescriptor[] = []) {
	return descriptors.map((descriptor) => {
		if (descriptor.kind === 'resource') {
			return buildResourceEffect(descriptor);
		}
		if (descriptor.kind === 'action') {
			return buildActionEffect(descriptor);
		}
		return buildStatEffect(descriptor);
	});
}

export function buildAttackEffect(descriptor: AttackEffectDescriptor) {
	const params = attackParams();
	const stats = descriptor.stats ?? ['power', 'absorption', 'fortification'];
	if (stats.includes('power')) {
		params.powerStat(statKey('power'));
	}
	if (stats.includes('absorption')) {
		params.absorptionStat(statKey('absorption'));
	}
	if (stats.includes('fortification')) {
		params.fortificationStat(statKey('fortification'));
	}
	if (descriptor.target.resource) {
		params.targetResource(descriptor.target.resource);
	}
	if (descriptor.target.building) {
		params.targetBuilding(descriptor.target.building);
	}
	if (descriptor.attacker?.length) {
		params.onDamageAttacker(...buildEffects(descriptor.attacker));
	}
	if (descriptor.defender?.length) {
		params.onDamageDefender(...buildEffects(descriptor.defender));
	}
	return effect('attack', 'perform').params(params.build()).build();
}

export const ACTION_DEFS: Record<string, ActionDefinition> = {
	attack: {
		meta: SYNTH_ATTACK,
		baseCosts: { [ContentResource.ap]: 1 },
		attack: {
			target: { resource: ContentResource.castleHP },
			attacker: [
				{
					kind: 'resource',
					method: ResourceMethods.ADD,
					key: ContentResource.happiness,
					amount: ATTACKER_HAPPINESS_GAIN,
				},
				{ kind: 'action', id: SYNTH_PLUNDER.id },
			],
			defender: [
				{
					kind: 'resource',
					method: ResourceMethods.REMOVE,
					key: ContentResource.happiness,
					amount: DEFENDER_HAPPINESS_LOSS,
				},
			],
		},
		extra: [
			{
				kind: 'stat',
				key: ContentStat.warWeariness,
				amount: WAR_WEARINESS_GAIN,
			},
		],
	},
	buildingAttack: {
		meta: SYNTH_BUILDING_ATTACK,
		baseCosts: { [ContentResource.ap]: 1 },
		attack: {
			target: { building: SYNTH_BUILDING.id },
			attacker: [
				{
					kind: 'resource',
					method: ResourceMethods.ADD,
					key: ContentResource.gold,
					amount: BUILDING_REWARD_GOLD,
				},
			],
		},
	},
	plunder: {
		meta: SYNTH_PLUNDER,
		system: true,
		extra: [
			{
				kind: 'resource',
				method: ResourceMethods.TRANSFER,
				key: ContentResource.gold,
				percent: PLUNDER_PERCENT,
			},
		],
	},
	partial: {
		meta: SYNTH_PARTIAL_ATTACK,
		baseCosts: { [ContentResource.ap]: 0 },
		attack: {
			target: { resource: ContentResource.castleHP },
			stats: ['power'],
		},
	},
};
