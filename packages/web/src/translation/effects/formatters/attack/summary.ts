import type { SummaryEntry } from '../../../content';
import {
	DEFAULT_ATTACK_STAT_LABELS,
	type AttackTarget,
	type BaseEntryContext,
	type AttackStatDescriptor,
} from './types';

const FALLBACK_ATTACK_ICON = '⚔️';
const DEFENDER_ICON = '🛡️';

function statIconOrLabel(
	descriptor: AttackStatDescriptor | undefined,
	fallbackLabel: string,
): string {
	if (descriptor?.icon) {
		return descriptor.icon;
	}
	if (descriptor?.label) {
		return descriptor.label;
	}
	return fallbackLabel;
}

function targetIconOrLabel<TTarget extends AttackTarget>(
	context: BaseEntryContext<TTarget>,
): string {
	if (context.info.icon) {
		return context.info.icon;
	}
	return context.info.label;
}

export function buildAttackSummaryBullet<TTarget extends AttackTarget>(
	context: BaseEntryContext<TTarget>,
): SummaryEntry {
	const powerIcon = statIconOrLabel(
		context.stats.power,
		DEFAULT_ATTACK_STAT_LABELS.power,
	);
	const targetIcon = targetIconOrLabel(context);
	const parts: string[] = [powerIcon, targetIcon];
	if (context.ignoreAbsorption && context.stats.absorption) {
		parts.push(
			`🚫${statIconOrLabel(
				context.stats.absorption,
				DEFAULT_ATTACK_STAT_LABELS.absorption,
			)}`,
		);
	}
	if (context.ignoreFortification && context.stats.fortification) {
		parts.push(
			`🚫${statIconOrLabel(
				context.stats.fortification,
				DEFAULT_ATTACK_STAT_LABELS.fortification,
			)}`,
		);
	}
	return parts.join('');
}

export function ownerSummaryIcon(owner: 'attacker' | 'defender'): string {
	return owner === 'attacker' ? FALLBACK_ATTACK_ICON : DEFENDER_ICON;
}

export function prefixOwnerSummary(
	owner: 'attacker' | 'defender',
	entry: SummaryEntry,
): SummaryEntry {
	const prefix = ownerSummaryIcon(owner);
	if (typeof entry === 'string') {
		return `${prefix}${entry}`;
	}
	return { ...entry, title: `${prefix}${entry.title}` };
}
