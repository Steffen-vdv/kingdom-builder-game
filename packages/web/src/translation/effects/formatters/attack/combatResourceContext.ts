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
} from '../attack/types';
import { selectAttackStatDescriptor } from './registrySelectors';

const ATTACK_STAT_ROLES: AttackStatRole[] = [
	'power',
	'absorption',
	'fortification',
];

type RawAttackStatParam = {
	role?: unknown;
	resourceId?: unknown;
	key?: unknown;
	label?: unknown;
	icon?: unknown;
};

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
 * Builds a stat descriptor from content data only.
 * Labels and icons come from resource metadata - no hardcoded fallbacks.
 */
function buildStatDescriptor(
	role: AttackStatRole,
	resourceId: string,
	context: TranslationContext,
): AttackStatDescriptor {
	const contentData = selectAttackStatDescriptor(context, resourceId);
	return {
		role,
		label: contentData.label,
		icon: contentData.icon,
		resourceId,
	};
}

/**
 * Resolves attack resources purely from effect params.
 * Content must provide the resources array - no defaults are assumed.
 */
function resolveAttackStats(
	effectDefinition: EffectDef<Record<string, unknown>>,
	translationContext: TranslationContext,
): AttackStatContext {
	const stats: AttackStatContext = {};
	const rawResources = effectDefinition.params?.['resources'];

	if (!Array.isArray(rawResources)) {
		return stats;
	}

	for (const entry of rawResources) {
		if (!isRawAttackStatParam(entry)) {
			continue;
		}
		const { role } = entry;
		if (!isAttackStatRole(role)) {
			continue;
		}
		// Support both 'resourceId' and legacy 'key' field
		const resourceId =
			typeof entry.resourceId === 'string'
				? entry.resourceId
				: typeof entry.key === 'string'
					? entry.key
					: undefined;

		if (!resourceId) {
			continue;
		}

		stats[role] = buildStatDescriptor(role, resourceId, translationContext);
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
