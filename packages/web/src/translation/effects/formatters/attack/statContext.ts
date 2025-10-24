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
	type AttackStatKey,
	DEFAULT_ATTACK_STAT_LABELS,
} from '../attack/types';
import {
	DEFAULT_ATTACK_POWER_STAT_KEY,
	DEFAULT_ATTACK_ABSORPTION_STAT_KEY,
	DEFAULT_ATTACK_FORTIFICATION_STAT_KEY,
} from './defaultKeys';
import {
	selectAttackResourceV2Descriptor,
	selectAttackStatDescriptor,
} from './registrySelectors';

type AttackStatSource = 'stat' | 'resourceV2';

const ATTACK_STAT_ROLES: AttackStatRole[] = [
	'power',
	'absorption',
	'fortification',
];

const DEFAULT_ATTACK_STAT_KEYS: Record<AttackStatRole, AttackStatKey> = {
	power: DEFAULT_ATTACK_POWER_STAT_KEY,
	absorption: DEFAULT_ATTACK_ABSORPTION_STAT_KEY,
	fortification: DEFAULT_ATTACK_FORTIFICATION_STAT_KEY,
};

const DEFAULT_ATTACK_STAT_SOURCES: Record<AttackStatRole, AttackStatSource> = {
	power: 'stat',
	absorption: 'resourceV2',
	fortification: 'stat',
};

type RawAttackStatParam = {
	role?: unknown;
	key?: unknown;
	label?: unknown;
	icon?: unknown;
	source?: unknown;
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

function isAttackStatSource(value: unknown): value is AttackStatSource {
	return value === 'stat' || value === 'resourceV2';
}

function buildStatDescriptor(
	role: AttackStatRole,
	key: AttackStatKey | undefined,
	source: AttackStatSource,
	overrides: AttackStatOverrides,
	context: TranslationContext,
): AttackStatDescriptor {
	const baseDescriptor = key
		? source === 'resourceV2'
			? selectAttackResourceV2Descriptor(context, key)
			: selectAttackStatDescriptor(context, key)
		: undefined;
	const label =
		overrides.label ??
		baseDescriptor?.label ??
		DEFAULT_ATTACK_STAT_LABELS[role];
	const icon = overrides.icon ?? baseDescriptor?.icon ?? '';
	const descriptor: AttackStatDescriptor = { role, label, icon, source };
	if (key !== undefined) {
		descriptor.key = key;
	}
	return descriptor;
}

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
			const key = typeof entry.key === 'string' ? entry.key : undefined;
			const label = typeof entry.label === 'string' ? entry.label : undefined;
			const icon = typeof entry.icon === 'string' ? entry.icon : undefined;
			const source = isAttackStatSource(entry.source)
				? entry.source
				: DEFAULT_ATTACK_STAT_SOURCES[role];
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
				source,
				overrides,
				translationContext,
			);
		}
		return stats;
	}
	for (const role of ATTACK_STAT_ROLES) {
		const key = DEFAULT_ATTACK_STAT_KEYS[role];
		const source = DEFAULT_ATTACK_STAT_SOURCES[role];
		stats[role] = buildStatDescriptor(
			role,
			key,
			source,
			{},
			translationContext,
		);
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
	translationContext: TranslationContext,
): AttackFormatterContext {
	const { formatter, target, info, targetLabel } = resolveAttackTargetFormatter(
		effectDefinition,
		translationContext,
	);
	const stats = resolveAttackStats(effectDefinition, translationContext);
	return { formatter, target, info, targetLabel, stats };
}
