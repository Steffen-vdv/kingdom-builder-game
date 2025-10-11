import { Stat, type StatKey } from '@kingdom-builder/contents';
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
import type { TranslationContext } from '../../../context';
import {
selectStatIconLabel,
type RegistryIconLabel,
} from '../../../registrySelectors';

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

function buildStatDescriptor(
role: AttackStatRole,
key: StatKey | undefined,
translationContext: TranslationContext,
overrides: AttackStatOverrides,
): AttackStatDescriptor {
let base: RegistryIconLabel | undefined;
if (key !== undefined) {
base = selectStatIconLabel(translationContext, key, {
fallbackLabel: DEFAULT_ATTACK_STAT_LABELS[role],
});
}
const label = overrides.label ?? base?.label ?? DEFAULT_ATTACK_STAT_LABELS[role];
const descriptor: AttackStatDescriptor = { role, label };
const icon = overrides.icon ?? base?.icon;
if (icon) {
descriptor.icon = icon;
}
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
                                translationContext,
                                overrides,
                        );
                }
                return stats;
        }
        for (const role of ATTACK_STAT_ROLES) {
                const key = DEFAULT_ATTACK_STAT_KEYS[role];
                stats[role] = buildStatDescriptor(
                        role,
                        key,
                        translationContext,
                        {},
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
const { formatter, target, info, targetLabel } =
resolveAttackTargetFormatter(effectDefinition, translationContext);
const stats = resolveAttackStats(effectDefinition, translationContext);
return { formatter, target, info, targetLabel, stats };
}
