import { cloneEffectList } from '../utils';
import type { EffectDef } from '../effects';
import type { PassiveMetadata, PassiveRecord } from './passive_types';

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
	if (record.detail !== undefined) {
		cloned.detail = record.detail;
	}
	const metadata = clonePassiveMetadata(record.meta);
	if (metadata) {
		cloned.meta = metadata;
	}
	return cloned;
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
