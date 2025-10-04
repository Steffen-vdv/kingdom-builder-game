import {
	BUILDINGS,
	RESOURCES,
	STATS,
	type ResourceKey,
	type StatKey,
} from '@kingdom-builder/contents';
import type { AttackLog, AttackPlayerDiff } from '@kingdom-builder/engine';
import { formatStatValue } from '../../../../utils/stats';
import type { SummaryEntry } from '../../../content';
import type {
	AttackTarget,
	BaseEntryContext,
	DiffFormatOptions,
	EvaluationContext,
	TargetInfo,
} from './types';

export function iconLabel(icon: string | undefined, label: string): string {
	return icon ? `${icon} ${label}` : label;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

export function formatNumber(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return NUMBER_FORMATTER.format(value);
}

export function formatPercent(value: number): string {
	return `${formatNumber(value * 100)}%`;
}

function formatSigned(value: number): string {
	const formatted = formatNumber(Math.abs(value));
	return `${value >= 0 ? '+' : '-'}${formatted}`;
}

function formatStatSigned(key: string, value: number): string {
	const formatted = formatStatValue(key, Math.abs(value));
	return `${value >= 0 ? '+' : '-'}${formatted}`;
}

type ResourceDiff = Extract<AttackPlayerDiff, { type: 'resource' }>;
type StatDiff = Extract<AttackPlayerDiff, { type: 'stat' }>;

type DiffFormatterMap = {
	[T in AttackPlayerDiff['type']]: (
		prefix: string,
		diff: Extract<AttackPlayerDiff, { type: T }>,
		options?: DiffFormatOptions,
	) => string;
};

const DIFF_FORMATTERS: DiffFormatterMap = {
	resource: (prefix, diff, options) =>
		formatResourceDiff(prefix, diff, options),
	stat: (prefix, diff) => formatStatDiff(prefix, diff),
};

export function formatResourceDiff(
	prefix: string,
	diff: ResourceDiff,
	options?: DiffFormatOptions,
): string {
	const info = RESOURCES[diff.key as ResourceKey];
	const icon = info?.icon || '';
	const label = info?.label || diff.key;
	const displayLabel = iconLabel(icon, label);
	const delta = diff.after - diff.before;
	const before = formatNumber(diff.before);
	const after = formatNumber(diff.after);
	if (options?.percent !== undefined) {
		const magnitude = Math.abs(options.percent);
		return `${prefix}: ${displayLabel} ${
			delta >= 0 ? '+' : '-'
		}${formatNumber(magnitude)}% (${before}→${after}) (${formatSigned(delta)})`;
	}
	if (options?.showPercent && diff.before !== 0 && delta !== 0) {
		const pct = (delta / diff.before) * 100;
		return `${prefix}: ${displayLabel} ${formatSigned(pct)}% (${before}→${after}) (${formatSigned(delta)})`;
	}
	return `${prefix}: ${displayLabel} ${formatSigned(delta)} (${before}→${after})`;
}

export function formatStatDiff(prefix: string, diff: StatDiff): string {
	const info = STATS[diff.key as StatKey];
	const icon = info?.icon || '';
	const label = info?.label || diff.key;
	const displayLabel = iconLabel(icon, label);
	const delta = diff.after - diff.before;
	const before = formatStatValue(String(diff.key), diff.before);
	const after = formatStatValue(String(diff.key), diff.after);
	return `${prefix}: ${displayLabel} ${formatStatSigned(
		String(diff.key),
		delta,
	)} (${before}→${after})`;
}

export function formatDiffCommon(
	prefix: string,
	diff: AttackPlayerDiff,
	options?: DiffFormatOptions,
): string {
	const formatter = DIFF_FORMATTERS[diff.type];
	if (!formatter) {
		throw new Error(`Unsupported attack diff type: ${diff.type}`);
	}
	return formatter(prefix, diff as never, options);
}

export function buildDescribeEntry(
	context: BaseEntryContext<AttackTarget>,
	fortificationItems: string[],
): SummaryEntry {
	const { army, absorption, ignoreAbsorption } = context;
	const absorptionItem = ignoreAbsorption
		? `Ignoring ${absorption.icon} ${absorption.label} damage reduction`
		: `${absorption.icon} ${absorption.label} damage reduction applied`;
	return {
		title: `Attack opponent with your ${army.icon} ${army.label}`,
		items: [absorptionItem, ...fortificationItems],
	};
}

export function defaultFortificationItems(
	context: BaseEntryContext<AttackTarget>,
): string[] {
	const { fort, targetLabel } = context;
	return [
		`Damage applied to opponent's ${fort.icon} ${fort.label}`,
		`If opponent ${fort.icon} ${fort.label} reduced to 0, overflow remaining damage on opponent ${targetLabel}`,
	];
}

export function buildingFortificationItems(
	context: BaseEntryContext<AttackTarget>,
): string[] {
	const { fort, targetLabel } = context;
	return [
		`Damage applied to opponent's ${fort.icon} ${fort.label}`,
		`If opponent ${fort.icon} ${fort.label} reduced to 0, overflow remaining damage attempts to destroy opponent ${targetLabel}`,
	];
}

export function buildStandardEvaluationEntry(
	log: AttackLog['evaluation'],
	context: EvaluationContext<AttackTarget>,
	isStat: boolean,
): SummaryEntry {
	const { army, absorption, fort, info } = context;
	const absorptionPart = log.absorption.ignored
		? `${absorption.icon} ignored`
		: `${absorption.icon}${formatPercent(log.absorption.before)}`;
	const fortPart = log.fortification.ignored
		? `${fort.icon} ignored`
		: `${fort.icon}${formatNumber(log.fortification.before)}`;
	const target = log.target as Extract<
		AttackLog['evaluation']['target'],
		{ type: 'resource' | 'stat' }
	>;
	const title = `Damage evaluation: ${army.icon}${formatNumber(
		log.power.modified,
	)} vs. ${absorptionPart} ${fortPart} ${info.icon}${formatNumber(
		target.before,
	)}`;
	const items: SummaryEntry[] = [];

	if (log.absorption.ignored) {
		items.push(
			`${army.icon}${formatNumber(log.power.modified)} ignores ${absorption.icon} ${absorption.label}`,
		);
	} else {
		items.push(
			`${army.icon}${formatNumber(log.power.modified)} vs. ${absorption.icon}${formatPercent(
				log.absorption.before,
			)} --> ${army.icon}${formatNumber(log.absorption.damageAfter)}`,
		);
	}

	if (log.fortification.ignored) {
		items.push(
			`${army.icon}${formatNumber(log.absorption.damageAfter)} bypasses ${fort.icon} ${fort.label}`,
		);
	} else {
		const remaining = Math.max(
			0,
			log.absorption.damageAfter - log.fortification.damage,
		);
		items.push(
			`${army.icon}${formatNumber(log.absorption.damageAfter)} vs. ${fort.icon}${formatNumber(
				log.fortification.before,
			)} --> ${fort.icon}${formatNumber(log.fortification.after)} ${army.icon}${formatNumber(
				remaining,
			)}`,
		);
	}

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

	items.push(
		`${army.icon}${formatNumber(target.damage)} vs. ${targetDisplay(
			target.before,
		)} --> ${targetDisplay(target.after)}`,
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
