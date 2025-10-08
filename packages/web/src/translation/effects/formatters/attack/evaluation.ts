import { BUILDINGS } from '@kingdom-builder/contents';
import type { AttackLog } from '@kingdom-builder/engine';
import { formatStatValue } from '../../../../utils/stats';
import type { SummaryEntry } from '../../../content';
import {
	attackStatLabel,
	attackStatValue,
	formatNumber,
	formatPercent,
	formatSignedValue,
	iconLabel,
} from './shared';
import type {
	AttackTarget,
	BaseEntryContext,
	EvaluationContext,
	TargetInfo,
} from './types';

export function buildDescribeEntry(
	context: BaseEntryContext<AttackTarget>,
	fortificationItems: string[],
): SummaryEntry {
	const { stats, ignoreAbsorption } = context;
	const power = stats.power;
	const absorption = stats.absorption;
	const powerLabel = attackStatLabel(power, 'attack power');
	const absorptionLabel = attackStatLabel(absorption, 'damage reduction');
	const title = power
		? `Attack opponent with your ${powerLabel}`
		: 'Attack opponent with your forces';
	const ignoringAbsorption = `Ignoring ${absorptionLabel} damage reduction`;
	const appliedAbsorption = `${absorptionLabel} damage reduction applied`;
	const absorptionItem = ignoreAbsorption
		? absorption
			? ignoringAbsorption
			: 'Ignoring damage reduction'
		: absorption
			? appliedAbsorption
			: 'Damage reduction applied';
	return {
		title,
		items: [absorptionItem, ...fortificationItems],
	};
}

export function defaultFortificationItems(
	context: BaseEntryContext<AttackTarget>,
): string[] {
	const { stats, targetLabel } = context;
	const fort = stats.fortification;
	if (!fort) {
		return [
			'Apply damage to opponent defenses',
			`If opponent defenses fall, overflow remaining damage onto opponent ${targetLabel}`,
		];
	}
	const fortDisplay = attackStatLabel(fort, 'fortification');
	return [
		`Apply damage to opponent ${fortDisplay}`,
		`If opponent ${fortDisplay} falls to 0, overflow remaining damage onto opponent ${targetLabel}`,
	];
}

export function buildingFortificationItems(
	context: BaseEntryContext<AttackTarget>,
): string[] {
	const { stats, targetLabel } = context;
	const fort = stats.fortification;
	if (!fort) {
		return [
			'Apply damage to opponent defenses',
			`If opponent defenses fall, use remaining damage to attempt to destroy opponent ${targetLabel}`,
		];
	}
	const fortDisplay = attackStatLabel(fort, 'fortification');
	return [
		`Apply damage to opponent ${fortDisplay}`,
		`If opponent ${fortDisplay} falls to 0, use remaining damage to attempt to destroy opponent ${targetLabel}`,
	];
}

export function buildStandardEvaluationEntry(
	log: AttackLog['evaluation'],
	context: EvaluationContext<AttackTarget>,
	isStat: boolean,
): SummaryEntry {
	const { stats, info } = context;
	const power = stats.power;
	const absorption = stats.absorption;
	const fort = stats.fortification;
	const powerValue = (value: number) =>
		attackStatValue(power, 'Attack', formatSignedValue(value, formatNumber));
	const absorptionValue = (value: number) =>
		attackStatValue(
			absorption,
			'Absorption',
			formatSignedValue(value, formatPercent),
		);
	const fortValue = (value: number) =>
		attackStatValue(
			fort,
			'Fortification',
			formatSignedValue(value, formatNumber),
		);
	const absorptionLabel = attackStatLabel(absorption, 'damage reduction');
	const fortLabel = attackStatLabel(fort, 'fortification');
	const target = log.target as Extract<
		AttackLog['evaluation']['target'],
		{ type: 'resource' | 'stat' }
	>;
	const formatTargetValue = (value: number) => {
		if (isStat) {
			return formatStatValue(String(target.key), value);
		}
		return formatNumber(value);
	};
	const targetDisplay = (value: number) => {
		const formatted = formatTargetValue(value);
		const label = iconLabel(info.icon, info.label);
		return `${label} ${formatted}`;
	};
	const powerModified = powerValue(log.power.modified);
	const absorptionBefore = absorptionValue(log.absorption.before);
	const powerAfterAbsorption = powerValue(log.absorption.damageAfter);
	const fortBefore = fortValue(log.fortification.before);
	const fortAfter = fortValue(log.fortification.after);
	const targetDamage = powerValue(log.target.damage);
	const remainingAfterFort = Math.max(
		0,
		log.absorption.damageAfter - log.fortification.damage,
	);
	const remainingPower = powerValue(remainingAfterFort);
	const titleSegments: string[] = [];

	if (log.absorption.ignored) {
		titleSegments.push(`Ignore ${absorptionLabel} with ${powerModified}`);
	} else {
		titleSegments.push(`Compare ${powerModified} against ${absorptionBefore}`);
	}

	if (log.fortification.ignored) {
		titleSegments.push(`Bypass ${fortLabel} with ${powerAfterAbsorption}`);
	} else {
		titleSegments.push(`Compare remaining damage against ${fortBefore}`);
	}

	titleSegments.push(`Apply damage to ${targetDisplay(target.before)}`);

	const title = `Evaluate damage: ${titleSegments.join('; ')}`;
	const items: SummaryEntry[] = [];

	if (log.absorption.ignored) {
		items.push(`Ignore ${absorptionLabel} with ${powerModified}`);
	} else {
		items.push(
			`Compare ${powerModified} against ${absorptionBefore} → ${powerAfterAbsorption}`,
		);
	}

	if (log.fortification.ignored) {
		items.push(`Bypass ${fortLabel} with ${powerAfterAbsorption}`);
	} else {
		items.push(
			`Compare ${powerAfterAbsorption} against ${fortBefore} → ${fortAfter} and carry forward ${remainingPower}`,
		);
	}

	items.push(
		`Apply ${targetDamage} to ${targetDisplay(target.before)} → ${targetDisplay(target.after)}`,
	);

	return { title, items };
}

export function getBuildingDisplay(id: string): TargetInfo {
	try {
		const def = BUILDINGS.get(id);
		return { icon: def.icon ?? '', label: def.name ?? id };
	} catch {
		return { icon: '', label: id };
	}
}
