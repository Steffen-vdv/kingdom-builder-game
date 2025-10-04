import type { PlayerId } from '../state';
import type { EffectDef } from '../effects';
import { cloneEffectList } from '../utils';
import type { StatSourceFrame } from '../stat_sources';
import type { PassiveMetadata, PassiveSummary } from './passive_types';

export type PassiveRecord = PassiveSummary & {
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	owner: PlayerId;
	frames: StatSourceFrame[];
	detail?: string;
	meta?: PassiveMetadata;
};

export function clonePassiveMetadata(
	metadata: PassiveMetadata | undefined,
): PassiveMetadata | undefined {
	if (!metadata) {
		return undefined;
	}
	const source = metadata.source ? { ...metadata.source } : undefined;
	const removal = metadata.removal ? { ...metadata.removal } : undefined;
	return {
		...(source ? { source } : {}),
		...(removal ? { removal } : {}),
	};
}

export function clonePassiveRecord(record: PassiveRecord): PassiveRecord {
	const effects = cloneEffectList(record.effects);
	const onGrowth = cloneEffectList(record.onGrowthPhase);
	const onUpkeep = cloneEffectList(record.onUpkeepPhase);
	const onBefore = cloneEffectList(record.onBeforeAttacked);
	const onAfter = cloneEffectList(record.onAttackResolved);
	const meta = clonePassiveMetadata(record.meta);
	return {
		id: record.id,
		owner: record.owner,
		frames: [...record.frames],
		...(record.name !== undefined ? { name: record.name } : {}),
		...(record.icon !== undefined ? { icon: record.icon } : {}),
		...(effects ? { effects } : {}),
		...(onGrowth ? { onGrowthPhase: onGrowth } : {}),
		...(onUpkeep ? { onUpkeepPhase: onUpkeep } : {}),
		...(onBefore ? { onBeforeAttacked: onBefore } : {}),
		...(onAfter ? { onAttackResolved: onAfter } : {}),
		...(record.detail !== undefined ? { detail: record.detail } : {}),
		...(meta ? { meta } : {}),
	};
}

export function reverseEffect(effect: EffectDef): EffectDef {
	const reversed: EffectDef = { ...effect };
	if (effect.effects) {
		reversed.effects = effect.effects.map(reverseEffect);
	}
	if (effect.method === 'add') {
		reversed.method = 'remove';
	} else if (effect.method === 'remove') {
		reversed.method = 'add';
	}
	return reversed;
}
