import type { SummaryEntry } from '../../../content';
import {
	type AttackTarget,
	type BaseEntryContext,
	type AttackStatDescriptor,
} from './types';

const DEFENDER_ICON = '🛡️';

/**
 * Returns icon if available, otherwise label.
 * Content must provide at least one of these.
 */
function statIconOrLabel(descriptor: AttackStatDescriptor | undefined): string {
	if (descriptor?.icon) {
		return descriptor.icon;
	}
	return descriptor?.label ?? '';
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
	const powerIcon = statIconOrLabel(context.stats.power);
	const targetIcon = targetIconOrLabel(context);
	const parts: string[] = [powerIcon, targetIcon];
	if (context.ignoreAbsorption && context.stats.absorption) {
		parts.push(`🚫${statIconOrLabel(context.stats.absorption)}`);
	}
	if (context.ignoreFortification && context.stats.fortification) {
		parts.push(`🚫${statIconOrLabel(context.stats.fortification)}`);
	}
	return parts.join('');
}

export function ownerSummaryIcon(owner: 'attacker' | 'defender'): string {
	// Attacker effects (like Plunder) don't need a prefix - the action icon
	// already identifies the effect. Defender effects use a shield icon.
	return owner === 'attacker' ? '' : DEFENDER_ICON;
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
