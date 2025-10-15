import type { EffectDef } from '@kingdom-builder/protocol';
import {
	resolveAttackTargetFormatter,
	type AttackTargetFormatter,
	type AttackTarget,
	type TargetInfo,
} from '../attack/target-formatter';
import {
	type AttackStatContext,
	type AttackStatDescriptor,
	type AttackStatRole,
	DEFAULT_ATTACK_STAT_LABELS,
} from '../attack/types';
import {
	selectAttackDefaultStatKey,
	selectAttackStatDescriptor,
} from './registrySelectors';
import type { TranslationContext } from '../../../context';
import type { StatKey } from '../attack/types';

const ATTACK_STAT_ROLES: AttackStatRole[] = [
	'power',
	'absorption',
	'fortification',
];

const ROLE_PREFERRED_KEYS: Record<AttackStatRole, ReadonlyArray<string>> = {
	power: ['armyStrength'],
	absorption: ['absorption'],
	fortification: ['fortificationStrength'],
};

type RawAttackStatParam = {
	role?: unknown;
	key?: unknown;
	label?: unknown;
	icon?: unknown;
};

type AttackStatOverrides = Partial<
	Pick<AttackStatDescriptor, 'label' | 'icon'>
>;

function isAttackStatRole(value: unknown): value is AttackStatRole {
	return (
		typeof value === 'string' &&
		ATTACK_STAT_ROLES.some((role) => role === value)
	);
}

function isRawAttackStatParam(value: unknown): value is RawAttackStatParam {
	return typeof value === 'object' && value !== null;
}

function buildStatDescriptor(
	role: AttackStatRole,
	key: StatKey | undefined,
	overrides: AttackStatOverrides,
	context: TranslationContext,
): AttackStatDescriptor {
	const baseDescriptor = key
		? selectAttackStatDescriptor(context, key)
		: undefined;
	const label =
		overrides.label ??
		baseDescriptor?.label ??
		DEFAULT_ATTACK_STAT_LABELS[role];
	const icon = overrides.icon ?? baseDescriptor?.icon ?? '';
	const descriptor: AttackStatDescriptor = { role, label, icon };
	if (key !== undefined) {
		descriptor.key = key;
	}
	return descriptor;
}

function resolveAttackStats(
	effectDefinition: EffectDef<Record<string, unknown>>,
	context: TranslationContext,
): AttackStatContext {
	const stats: AttackStatContext = {};
	const rawStats = effectDefinition.params?.['stats'];
	if (Array.isArray(rawStats)) {
		for (const entry of rawStats) {
			if (!isRawAttackStatParam(entry)) {
				continue;
			}
			const { role } = entry;
			if (!isAttackStatRole(role)) {
				continue;
			}
			const key =
				typeof entry.key === 'string' ? (entry.key as StatKey) : undefined;
			const label = typeof entry.label === 'string' ? entry.label : undefined;
			const icon = typeof entry.icon === 'string' ? entry.icon : undefined;
			const overrides: AttackStatOverrides = {};
			if (label !== undefined) {
				overrides.label = label;
			}
			if (icon !== undefined) {
				overrides.icon = icon;
			}
			stats[role] = buildStatDescriptor(role, key, overrides, context);
		}
		return stats;
	}
	for (const role of ATTACK_STAT_ROLES) {
		const key = resolveDefaultAttackStatKey(role, context);
		stats[role] = buildStatDescriptor(role, key, {}, context);
	}
	return stats;
}

export type AttackFormatterContext = {
	formatter: AttackTargetFormatter;
	info: TargetInfo;
	target: AttackTarget;
	targetLabel: string;
	stats: AttackStatContext;
};

export function resolveAttackFormatterContext(
	effectDefinition: EffectDef<Record<string, unknown>>,
	context: TranslationContext,
): AttackFormatterContext {
	const { formatter, target, info, targetLabel } = resolveAttackTargetFormatter(
		effectDefinition,
		context,
	);
	const stats = resolveAttackStats(effectDefinition, context);
	return { formatter, target, info, targetLabel, stats };
}

function resolveDefaultAttackStatKey(
	role: AttackStatRole,
	context: TranslationContext,
): StatKey | undefined {
	const preferred = ROLE_PREFERRED_KEYS[role] ?? [];
	const stats = context.assets.stats ?? {};
	for (const candidate of preferred) {
		if (stats[candidate]) {
			return candidate as StatKey;
		}
	}
	const fallback = selectAttackDefaultStatKey(context);
	if (fallback) {
		return fallback as StatKey;
	}
	const firstKey = Object.keys(stats)[0];
	return firstKey as StatKey | undefined;
}
