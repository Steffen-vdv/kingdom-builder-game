import { Stat, type StatKey } from '@kingdom-builder/contents';
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

const DEFAULT_ATTACK_STAT_KEYS: Record<AttackStatRole, StatKey> = {
	power: Stat.armyStrength,
	absorption: Stat.absorption,
	fortification: Stat.fortificationStrength,
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

/**
 * Construct an AttackStatDescriptor for a given attack stat role, using an optional stat key and overrides resolved with the provided translation context.
 *
 * @param role - The attack stat role to describe ('power', 'absorption', or 'fortification').
 * @param key - Optional StatKey used to resolve a base descriptor; when omitted the descriptor will not include a `key` property.
 * @param overrides - Partial overrides for `label` and `icon` that take precedence over resolved or default values.
 * @param context - TranslationContext used to resolve the base descriptor for `key`.
 * @returns The assembled AttackStatDescriptor containing `role`, `label`, `icon`, and `key` when provided.
 */
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

/**
 * Resolve attack stat descriptors for an effect definition using the provided translation context.
 *
 * @param effectDefinition - Effect definition whose `params['stats']` (if present) are used to configure attack stats
 * @param translationContext - Context used to resolve stat descriptors and localized labels/icons
 * @returns An AttackStatContext mapping each attack stat role to its resolved AttackStatDescriptor; entries are taken from the effect's `stats` parameter when available, otherwise default stat descriptors are returned
 */
function resolveAttackStats(
	effectDefinition: EffectDef<Record<string, unknown>>,
	translationContext: TranslationContext,
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
			stats[role] = buildStatDescriptor(
				role,
				key,
				overrides,
				translationContext,
			);
		}
		return stats;
	}
	for (const role of ATTACK_STAT_ROLES) {
		const key = DEFAULT_ATTACK_STAT_KEYS[role];
		stats[role] = buildStatDescriptor(role, key, {}, translationContext);
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

/**
 * Resolve all attack formatting context (target formatter, target info, label, and stats) for an effect using the provided translation context.
 *
 * @param effectDefinition - Effect definition whose attack formatter and stats should be resolved
 * @param translationContext - Translation context used to resolve labels and stat descriptors
 * @returns An AttackFormatterContext containing `formatter`, `target`, `info`, `targetLabel`, and resolved `stats`
 */
export function resolveAttackFormatterContext(
	effectDefinition: EffectDef<Record<string, unknown>>,
	translationContext: TranslationContext,
): AttackFormatterContext {
	const { formatter, target, info, targetLabel } = resolveAttackTargetFormatter(
		effectDefinition,
		translationContext,
	);
	const stats = resolveAttackStats(effectDefinition, translationContext);
	return { formatter, target, info, targetLabel, stats };
}