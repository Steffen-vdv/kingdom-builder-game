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
		...record,
		frames: [...record.frames],
	};
	if (record.name === undefined && 'name' in cloned) {
		delete cloned.name;
	}
	if (record.icon === undefined && 'icon' in cloned) {
		delete cloned.icon;
	}
	if (record.detail === undefined && 'detail' in cloned) {
		delete cloned.detail;
	}
	const effects = cloneEffectList(record.effects);
	if (effects) {
		cloned.effects = effects;
	} else if ('effects' in cloned) {
		delete cloned.effects;
	}
	const onGrowth = cloneEffectList(record.onGrowthPhase);
	if (onGrowth) {
		cloned.onGrowthPhase = onGrowth;
	} else if ('onGrowthPhase' in cloned) {
		delete cloned.onGrowthPhase;
	}
	const onUpkeep = cloneEffectList(record.onUpkeepPhase);
	if (onUpkeep) {
		cloned.onUpkeepPhase = onUpkeep;
	} else if ('onUpkeepPhase' in cloned) {
		delete cloned.onUpkeepPhase;
	}
	const onBefore = cloneEffectList(record.onBeforeAttacked);
	if (onBefore) {
		cloned.onBeforeAttacked = onBefore;
	} else if ('onBeforeAttacked' in cloned) {
		delete cloned.onBeforeAttacked;
	}
	const onAfter = cloneEffectList(record.onAttackResolved);
	if (onAfter) {
		cloned.onAttackResolved = onAfter;
	} else if ('onAttackResolved' in cloned) {
		delete cloned.onAttackResolved;
	}
	const metadata = clonePassiveMetadata(record.meta);
	if (metadata) {
		cloned.meta = metadata;
	} else if ('meta' in cloned) {
		delete cloned.meta;
	}
	const reservedKeys = new Set([
		'id',
		'name',
		'icon',
		'effects',
		'onGrowthPhase',
		'onUpkeepPhase',
		'onBeforeAttacked',
		'onAttackResolved',
		'owner',
		'frames',
		'detail',
		'meta',
	]);
	for (const [key, value] of Object.entries(record)) {
		if (reservedKeys.has(key)) {
			continue;
		}
		if (value === undefined) {
			if (key in cloned) {
				delete cloned[key];
			}
			continue;
		}
		if (Array.isArray(value)) {
			cloned[key] = value.map((entry) => {
				const clonedEntry: unknown = structuredClone(entry);
				return clonedEntry;
			});
			continue;
		}
		if (typeof value === 'object' && value !== null) {
			const clonedValue: unknown = structuredClone(value);
			cloned[key] = clonedValue;
			continue;
		}
		cloned[key] = value;
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
