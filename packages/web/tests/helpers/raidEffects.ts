import type { EffectDef } from '@kingdom-builder/protocol';

import {
	SYNTH_ATTACK,
	SYNTH_PLUNDER,
	SYNTH_BUILDING_ATTACK,
	SYNTH_PARTIAL_ATTACK,
	SYNTH_BUILDING,
	COMBAT_STAT_CONFIG,
	SYNTH_RESOURCE_IDS,
	PLUNDER_HAPPINESS_AMOUNT,
	WAR_WEARINESS_GAIN,
	BUILDING_REWARD_GOLD,
	PLUNDER_PERCENT,
	type SyntheticAction,
} from './raidConfig';

export type ResourceMethod = 'add' | 'remove' | 'transfer';
export type ActionMethod = 'perform';
export type StatMethod = 'add';

export type ResourceEffectDescriptor = {
	kind: 'resource';
	method: ResourceMethod;
	key: string;
	amount?: number;
	percent?: number;
};

export type ActionEffectDescriptor = {
	kind: 'action';
	id: string;
};

export type StatEffectDescriptor = {
	kind: 'stat';
	key: string;
	amount: number;
};

export type EffectDescriptor =
	| ResourceEffectDescriptor
	| ActionEffectDescriptor
	| StatEffectDescriptor;

export type AttackEffectDescriptor = {
	target: { resource?: string; building?: string };
	attacker?: EffectDescriptor[];
	defender?: EffectDescriptor[];
	stats?: Array<'power' | 'absorption' | 'fortification'>;
};

export type ActionDefinition = {
	meta: SyntheticAction;
	baseCosts?: Record<string, number>;
	attack?: AttackEffectDescriptor;
	extra?: EffectDescriptor[];
	system?: boolean;
};

function buildResourceEffect(descriptor: ResourceEffectDescriptor): EffectDef {
	if (descriptor.method === 'transfer') {
		// transfer requires donor and recipient payloads
		const hasPercent = descriptor.percent !== undefined;
		// Percent change uses modifiers (values are fractions like 0.4 for 40%)
		const percentFraction =
			descriptor.percent !== undefined ? descriptor.percent / 100 : 0;
		const recipientChange = hasPercent
			? {
					type: 'percent' as const,
					modifiers: [percentFraction] as readonly number[],
				}
			: { type: 'amount' as const, amount: descriptor.amount ?? 0 };
		const donorChange = hasPercent
			? {
					type: 'percent' as const,
					modifiers: [-percentFraction] as readonly number[],
				}
			: { type: 'amount' as const, amount: -(descriptor.amount ?? 0) };
		return {
			type: 'resource',
			method: 'transfer',
			params: {
				// Legacy params for translation formatter
				key: descriptor.key,
				...(descriptor.percent !== undefined
					? { percent: descriptor.percent }
					: {}),
				...(descriptor.amount !== undefined
					? { amount: descriptor.amount }
					: {}),
				// params for engine execution
				donor: {
					player: 'opponent' as const,
					resourceId: descriptor.key,
					change: donorChange,
				},
				recipient: {
					player: 'active' as const,
					resourceId: descriptor.key,
					change: recipientChange,
				},
			},
		};
	}
	return {
		type: 'resource',
		method: descriptor.method,
		params: {
			resourceId: descriptor.key,
			change: { type: 'amount', amount: descriptor.amount ?? 0 },
		},
	};
}

function buildActionEffect(descriptor: ActionEffectDescriptor): EffectDef {
	return {
		type: 'action',
		method: 'perform',
		params: { id: descriptor.id },
	};
}

function buildStatEffect(descriptor: StatEffectDescriptor): EffectDef {
	return {
		type: 'resource',
		method: 'add',
		params: {
			resourceId: descriptor.key,
			change: { type: 'amount', amount: descriptor.amount },
		},
	};
}

export function buildEffects(
	descriptors: EffectDescriptor[] = [],
): EffectDef[] {
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

type AttackParams = {
	target: { type: 'resource'; key: string } | { type: 'building'; id: string };
	stats?: Array<{
		role: 'power' | 'absorption' | 'fortification';
		key: string;
		label?: string;
		icon?: string;
	}>;
	onDamage?: {
		attacker?: EffectDef[];
		defender?: EffectDef[];
	};
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
};

export function buildAttackEffect(
	descriptor: AttackEffectDescriptor,
): EffectDef {
	const params: AttackParams = {
		target: descriptor.target.resource
			? { type: 'resource', key: descriptor.target.resource }
			: {
					type: 'building',
					id: descriptor.target.building ?? SYNTH_BUILDING.id,
				},
	};
	const stats = descriptor.stats ?? ['power', 'absorption', 'fortification'];
	const annotations = [] as AttackParams['stats'];
	for (const role of stats) {
		const config = COMBAT_STAT_CONFIG[role];
		if (!config) {
			continue;
		}
		annotations?.push({
			role,
			key: config.key,
			label: config.label,
			icon: config.icon,
		});
	}
	if (annotations && annotations.length > 0) {
		params.stats = annotations;
	}
	if (descriptor.attacker?.length || descriptor.defender?.length) {
		params.onDamage = {};
		if (descriptor.attacker?.length) {
			params.onDamage.attacker = buildEffects(descriptor.attacker);
		}
		if (descriptor.defender?.length) {
			params.onDamage.defender = buildEffects(descriptor.defender);
		}
	}
	return {
		type: 'attack',
		method: 'perform',
		params,
	};
}

export const ACTION_DEFS: Record<string, ActionDefinition> = {
	attack: {
		meta: SYNTH_ATTACK,
		system: true,
		baseCosts: { [SYNTH_RESOURCE_IDS.ap]: 1 },
		attack: {
			target: { resource: SYNTH_RESOURCE_IDS.castleHP },
			attacker: [{ kind: 'action', id: SYNTH_PLUNDER.id }],
		},
		extra: [
			{
				kind: 'stat',
				key: SYNTH_RESOURCE_IDS.warWeariness,
				amount: WAR_WEARINESS_GAIN,
			},
		],
	},
	buildingAttack: {
		meta: SYNTH_BUILDING_ATTACK,
		system: true,
		baseCosts: { [SYNTH_RESOURCE_IDS.ap]: 1 },
		attack: {
			target: { building: SYNTH_BUILDING.id },
			attacker: [
				{
					kind: 'resource',
					method: 'add',
					key: SYNTH_RESOURCE_IDS.gold,
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
				method: 'transfer',
				key: SYNTH_RESOURCE_IDS.happiness,
				amount: PLUNDER_HAPPINESS_AMOUNT,
			},
			{
				kind: 'resource',
				method: 'transfer',
				key: SYNTH_RESOURCE_IDS.gold,
				percent: PLUNDER_PERCENT,
			},
		],
	},
	partial: {
		meta: SYNTH_PARTIAL_ATTACK,
		system: true,
		baseCosts: { [SYNTH_RESOURCE_IDS.ap]: 0 },
		attack: {
			target: { resource: SYNTH_RESOURCE_IDS.castleHP },
			stats: ['power'],
		},
	},
};
