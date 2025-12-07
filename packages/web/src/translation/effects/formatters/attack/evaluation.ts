import type { AttackLog } from '@kingdom-builder/protocol';
import { formatStatValue } from '../../../../utils/resourceSources';
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
import type { TranslationContext } from '../../../context';
import { selectAttackBuildingDescriptor } from './registrySelectors';

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
	const fortificationStat = stats.fortification;
	if (!fortificationStat) {
		return [
			'Apply damage to opponent defenses',
			`If opponent defenses fall, overflow remaining damage onto opponent ${targetLabel}`,
		];
	}
	const fortificationDisplay = attackStatLabel(
		fortificationStat,
		'fortification',
	);
	return [
		`Apply damage to opponent ${fortificationDisplay}`,
		`If opponent ${fortificationDisplay} falls to 0, overflow remaining damage onto opponent ${targetLabel}`,
	];
}

export function buildingFortificationItems(
	context: BaseEntryContext<AttackTarget>,
): string[] {
	const { stats, targetLabel } = context;
	const fortificationStat = stats.fortification;
	if (!fortificationStat) {
		return [
			'Apply damage to opponent defenses',
			`If opponent defenses fall, use remaining damage to attempt to destroy opponent ${targetLabel}`,
		];
	}
	const fortificationDisplay = attackStatLabel(
		fortificationStat,
		'fortification',
	);
	return [
		`Apply damage to opponent ${fortificationDisplay}`,
		`If opponent ${fortificationDisplay} falls to 0, use remaining damage to attempt to destroy opponent ${targetLabel}`,
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
	const fortificationStat = stats.fortification;
	const powerValue = (value: number) =>
		attackStatValue(power, 'Attack', formatSignedValue(value, formatNumber));
	const absorptionValue = (value: number) =>
		attackStatValue(
			absorption,
			'Absorption',
			formatSignedValue(value, formatPercent),
		);
	const fortificationValue = (value: number) =>
		attackStatValue(
			fortificationStat,
			'Fortification',
			formatSignedValue(value, formatNumber),
		);
	const absorptionLabel = attackStatLabel(absorption, 'damage reduction');
	const fortificationLabel = attackStatLabel(
		fortificationStat,
		'fortification',
	);
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
	const fortificationBefore = fortificationValue(log.fortification.before);
	const fortificationAfter = fortificationValue(log.fortification.after);
	const targetDamage = powerValue(log.target.damage);
	const remainingAfterFortification = Math.max(
		0,
		log.absorption.damageAfter - log.fortification.damage,
	);
	const remainingPower = powerValue(remainingAfterFortification);
	const titleSegments: string[] = [];

	if (log.absorption.ignored) {
		titleSegments.push(`Ignore ${absorptionLabel} with ${powerModified}`);
	} else {
		titleSegments.push(`Compare ${powerModified} against ${absorptionBefore}`);
	}

	if (log.fortification.ignored) {
		titleSegments.push(
			`Bypass ${fortificationLabel} with ${powerAfterAbsorption}`,
		);
	} else {
		titleSegments.push(
			`Compare remaining damage against ${fortificationBefore}`,
		);
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
		items.push(`Bypass ${fortificationLabel} with ${powerAfterAbsorption}`);
	} else {
		items.push(
			`Compare ${powerAfterAbsorption} against ${fortificationBefore} → ${fortificationAfter} and carry forward ${remainingPower}`,
		);
	}

	items.push(
		`Apply ${targetDamage} to ${targetDisplay(target.before)} → ${targetDisplay(target.after)}`,
	);

	return { title, items };
}

export function getBuildingDisplay(
	context: Pick<TranslationContext, 'assets' | 'buildings'>,
	buildingId: string,
): TargetInfo {
	return selectAttackBuildingDescriptor(context, buildingId);
}
