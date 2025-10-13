import type { EffectDef } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../../context';
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
import { selectAttackStatDescriptor } from './registrySelectors';

const ATTACK_STAT_ROLES: AttackStatRole[] = [
	'power',
	'absorption',
	'fortification',
];

const DEFAULT_ATTACK_STAT_KEYS: Record<AttackStatRole, string> = {
	power: 'armyStrength',
	absorption: 'absorption',
	fortification: 'fortificationStrength',
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
	translationContext: TranslationContext,
	role: AttackStatRole,
	key: string | undefined,
	overrides: AttackStatOverrides,
): AttackStatDescriptor {
	const baseDescriptor = key
		? selectAttackStatDescriptor(translationContext, key)
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
	translationContext: TranslationContext,
	effectDefinition: EffectDef<Record<string, unknown>>,
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
			const key = typeof entry.key === 'string' ? entry.key : undefined;
			const label = typeof entry.label === 'string' ? entry.label : undefined;
			const icon = typeof entry.icon === 'string' ? entry.icon : undefined;
			const overrides: AttackStatOverrides = {};
			if (label !== undefined) {
				overrides.label = label;
			}
			if (icon !== undefined) {
				overrides.icon = icon;
			}
			stats[role] = buildStatDescriptor(
				translationContext,
				role,
				key,
				overrides,
			);
		}
		return stats;
	}
	for (const role of ATTACK_STAT_ROLES) {
		const key = DEFAULT_ATTACK_STAT_KEYS[role];
		stats[role] = buildStatDescriptor(translationContext, role, key, {});
	}
	return stats;
}

export type AttackFormatterContext = {
	translationContext: TranslationContext;
	formatter: AttackTargetFormatter;
	info: TargetInfo;
	target: AttackTarget;
	targetLabel: string;
	stats: AttackStatContext;
};

export function resolveAttackFormatterContext(
	effectDefinition: EffectDef<Record<string, unknown>>,
	translationContext: TranslationContext,
): AttackFormatterContext {
	const { formatter, target, info, targetLabel } = resolveAttackTargetFormatter(
		effectDefinition,
		translationContext,
	);
	const stats = resolveAttackStats(translationContext, effectDefinition);
	return { formatter, target, info, targetLabel, stats, translationContext };
}
