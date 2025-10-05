import { BUILDINGS } from '@kingdom-builder/contents';
import type { AttackLog } from '@kingdom-builder/engine';
import { formatStatValue } from '../../../../utils/stats';
import type { SummaryEntry } from '../../../content';
import { formatNumber, formatPercent, iconLabel } from './shared';
import type {
	AttackTarget,
	BaseEntryContext,
	EvaluationContext,
	TargetInfo,
	AttackStatDescriptor,
} from './types';

const statLabel = (
	stat: AttackStatDescriptor | undefined,
	fallback: string,
): string => (stat ? iconLabel(stat.icon, stat.label) : fallback);

const statValue = (
	stat: AttackStatDescriptor | undefined,
	fallback: string,
	value: string,
): string =>
	stat?.icon
		? `${stat.icon}${value}`
		: stat
			? `${stat.label} ${value}`
			: `${fallback} ${value}`;

export function buildDescribeEntry(
	context: BaseEntryContext<AttackTarget>,
	fortificationItems: string[],
): SummaryEntry {
	const { stats, ignoreAbsorption } = context;
	const power = stats.power;
	const absorption = stats.absorption;
	const powerLabel = statLabel(power, 'attack power');
	const absorptionLabel = statLabel(absorption, 'damage reduction');
	const title = power
		? ['Attack opponent with your ', powerLabel].join('')
		: 'Attack opponent with your forces';
	const ignoringAbsorption = [
		'Ignoring ',
		absorptionLabel,
		' damage reduction',
	].join('');
	const appliedAbsorption = [absorptionLabel, ' damage reduction applied'].join(
		'',
	);
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
			"Damage applied to opponent's defenses",
			[
				'If opponent defenses fall, ',
				'overflow remaining damage ',
				'on opponent ',
				targetLabel,
			].join(''),
		];
	}
	const fortDisplay = statLabel(fort, 'fortification');
	return [
		`Damage applied to opponent's ${fortDisplay}`,
		[
			'If opponent ',
			fortDisplay,
			' reduced to 0, overflow remaining damage ',
			'on opponent ',
			targetLabel,
		].join(''),
	];
}

export function buildingFortificationItems(
	context: BaseEntryContext<AttackTarget>,
): string[] {
	const { stats, targetLabel } = context;
	const fort = stats.fortification;
	if (!fort) {
		return [
			`Damage applied to opponent's defenses`,
			[
				'If opponent defenses fall, ',
				'overflow remaining damage ',
				'attempts to destroy opponent ',
				targetLabel,
			].join(''),
		];
	}
	const fortDisplay = statLabel(fort, 'fortification');
	return [
		`Damage applied to opponent's ${fortDisplay}`,
		[
			'If opponent ',
			fortDisplay,
			' reduced to 0, overflow remaining damage ',
			'attempts to destroy opponent ',
			targetLabel,
		].join(''),
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
		statValue(power, 'Attack', formatNumber(value));
	const absorptionValue = (value: number) =>
		statValue(absorption, 'Absorption', formatPercent(value));
	const fortValue = (value: number) =>
		statValue(fort, 'Fortification', formatNumber(value));
	const absorptionLabel = statLabel(absorption, 'damage reduction');
	const fortLabel = statLabel(fort, 'fortification');
	const absorptionPart = log.absorption.ignored
		? absorption?.icon
			? `${absorption.icon} ignored`
			: `${absorptionLabel} ignored`
		: absorptionValue(log.absorption.before);
	const fortPart = log.fortification.ignored
		? fort?.icon
			? `${fort.icon} ignored`
			: `${fortLabel} ignored`
		: fortValue(log.fortification.before);
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
		if (info.icon) {
			return `${info.icon}${formatted}`;
		}
		return `${info.label} ${formatted}`;
	};
	const title = [
		'Damage evaluation:',
		`${powerValue(log.power.modified)} vs.`,
		absorptionPart,
		fortPart,
		targetDisplay(target.before),
	].join(' ');
	const items: SummaryEntry[] = [];

	if (log.absorption.ignored) {
		items.push(
			[powerValue(log.power.modified), 'ignores', absorptionLabel].join(' '),
		);
	} else {
		items.push(
			[
				`${powerValue(log.power.modified)} vs.`,
				absorptionValue(log.absorption.before),
				`--> ${powerValue(log.absorption.damageAfter)}`,
			].join(' '),
		);
	}

	if (log.fortification.ignored) {
		items.push(
			[powerValue(log.absorption.damageAfter), 'bypasses', fortLabel].join(' '),
		);
	} else {
		const remaining = Math.max(
			0,
			log.absorption.damageAfter - log.fortification.damage,
		);
		items.push(
			[
				`${powerValue(log.absorption.damageAfter)} vs.`,
				fortValue(log.fortification.before),
				`--> ${fortValue(log.fortification.after)}`,
				powerValue(remaining),
			].join(' '),
		);
	}

	items.push(
		[
			`${powerValue(log.target.damage)} vs.`,
			targetDisplay(target.before),
			`--> ${targetDisplay(target.after)}`,
		].join(' '),
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
