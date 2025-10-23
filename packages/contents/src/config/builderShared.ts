export const Types = {
	Land: 'land',
	Resource: 'resource',
	ResourceV2: 'resource_v2',
	Building: 'building',
	Development: 'development',
	Passive: 'passive',
	CostMod: 'cost_mod',
	ResultMod: 'result_mod',
	Population: 'population',
	Action: 'action',
	Attack: 'attack',
	Stat: 'stat',
} as const;

export const LandMethods = {
	ADD: 'add',
	TILL: 'till',
} as const;

export const ResourceMethods = {
	ADD: 'add',
	REMOVE: 'remove',
	TRANSFER: 'transfer',
} as const;

export const ResourceV2Methods = {
	ADD: 'add',
	REMOVE: 'remove',
	TRANSFER: 'transfer',
} as const;

export const ResourceV2BoundMethods = {
	INCREASE_UPPER_BOUND: 'increase_upper_bound',
} as const;

export const BuildingMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const DevelopmentMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const PassiveMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const CostModMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const ResultModMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const PopulationMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const ActionMethods = {
	ADD: 'add',
	REMOVE: 'remove',
	PERFORM: 'perform',
} as const;

export const AttackMethods = {
	PERFORM: 'perform',
} as const;

export const StatMethods = {
	ADD: 'add',
	ADD_PCT: 'add_pct',
	REMOVE: 'remove',
} as const;

export const RequirementTypes = {
	Evaluator: 'evaluator',
} as const;

export type Params = Record<string, unknown>;

export abstract class ParamsBuilder<P extends Params = Params> {
	protected params: P;
	private readonly assigned = new Set<keyof P>();

	constructor(initial?: P) {
		this.params = initial ?? ({} as P);
	}

	protected wasSet(key: keyof P) {
		return this.assigned.has(key);
	}

	protected set<K extends keyof P>(key: K, value: P[K], message?: string) {
		if (this.assigned.has(key)) {
			throw new Error(message ?? `You already set ${String(key)} for this configuration. ` + `Remove the extra ${String(key)} call.`);
		}
		this.params[key] = value;
		this.assigned.add(key);
		return this;
	}

	build(): P {
		return this.params;
	}
}
