import type { EffectDef } from '../effects';
import type { PlayerId } from '../state';
import type { StatSourceFrame } from '../stat_sources';
import { cloneEffectList } from '../utils';

export interface PassiveSourceMetadata {
	type: string;
	id: string;
	icon?: string | undefined;
	labelToken?: string | undefined;
}

export interface PassiveRemovalMetadata {
	token?: string | undefined;
	text?: string | undefined;
}

export interface PassiveMetadata {
	source?: PassiveSourceMetadata | undefined;
	removal?: PassiveRemovalMetadata | undefined;
}

export interface PassiveSummary {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
	detail?: string | undefined;
	meta?: PassiveMetadata | undefined;
}

export type PassiveRecord = PassiveSummary & {
	effects?: EffectDef[] | undefined;
	onGrowthPhase?: EffectDef[] | undefined;
	onUpkeepPhase?: EffectDef[] | undefined;
	onBeforeAttacked?: EffectDef[] | undefined;
	onAttackResolved?: EffectDef[] | undefined;
	owner: PlayerId;
	frames: StatSourceFrame[];
};

export type PassiveOptions = {
	frames?: StatSourceFrame | StatSourceFrame[];
	detail?: string;
	meta?: PassiveMetadata;
};

export function clonePassiveMetadata(
	metadata: PassiveMetadata | undefined,
): PassiveMetadata | undefined {
	if (!metadata) {
		return undefined;
	}
	const cloned: PassiveMetadata = {};
	if (metadata.source) {
		cloned.source = { ...metadata.source };
	}
	if (metadata.removal) {
		cloned.removal = { ...metadata.removal };
	}
	return cloned;
}

export function clonePassiveRecord(record: PassiveRecord): PassiveRecord {
	const cloned: PassiveRecord = {
		id: record.id,
		owner: record.owner,
		frames: [...record.frames],
	};
	if (record.name !== undefined) {
		cloned.name = record.name;
	}
	if (record.icon !== undefined) {
		cloned.icon = record.icon;
	}
	if (record.detail !== undefined) {
		cloned.detail = record.detail;
	}
	const meta = clonePassiveMetadata(record.meta);
	if (meta) {
		cloned.meta = meta;
	}
	const effects = cloneEffectList(record.effects);
	if (effects) {
		cloned.effects = effects;
	}
	const onGrowth = cloneEffectList(record.onGrowthPhase);
	if (onGrowth) {
		cloned.onGrowthPhase = onGrowth;
	}
	const onUpkeep = cloneEffectList(record.onUpkeepPhase);
	if (onUpkeep) {
		cloned.onUpkeepPhase = onUpkeep;
	}
	const onBefore = cloneEffectList(record.onBeforeAttacked);
	if (onBefore) {
		cloned.onBeforeAttacked = onBefore;
	}
	const onAfter = cloneEffectList(record.onAttackResolved);
	if (onAfter) {
		cloned.onAttackResolved = onAfter;
	}
	return cloned;
}
