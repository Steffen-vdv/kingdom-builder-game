export type ResourceAttackTarget = {
	type: 'resource';
	key: string;
};

export type StatAttackTarget = {
	type: 'stat';
	key: string;
};

export type BuildingAttackTarget = {
	type: 'building';
	id: string;
};

export type AttackTarget =
	| ResourceAttackTarget
	| StatAttackTarget
	| BuildingAttackTarget;
