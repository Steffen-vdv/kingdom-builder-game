import { BUILDINGS } from '@kingdom-builder/contents';
import type { AttackLog } from '@kingdom-builder/engine';
import {
	formatDiffCommon,
	formatNumber,
	formatPercent,
	iconLabel,
} from './shared';
import {
	buildDescribeEntry,
	buildingFortificationItems,
	getBuildingDisplay,
} from './evaluation';
import type { AttackTargetFormatter } from './types';
import type { SummaryEntry } from '../../../content';

const buildingFormatter: AttackTargetFormatter<{
	type: 'building';
	id: string;
}> = {
	type: 'building',
	parseEffectTarget(effect) {
		const targetParam = effect.params?.['target'] as
			| { type: 'building'; id: string }
			| undefined;
		if (targetParam?.type === 'building') {
			return targetParam;
		}
		const [id] = BUILDINGS.keys();
		return { type: 'building', id: id ?? 'unknown_building' };
	},
	normalizeLogTarget(target) {
		const buildingTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'building' }
		>;
		return { type: 'building', id: buildingTarget.id };
	},
	getInfo(target) {
		return getBuildingDisplay(target.id);
	},
	getTargetLabel(info) {
		return iconLabel(info.icon, info.label);
	},
	buildBaseEntry(context) {
		if (context.mode === 'summarize') {
			const power = context.stats.power;
			const powerDisplay = power ? power.icon || power.label : 'Attack';
			return `${powerDisplay} destroy opponent's ${context.targetLabel}`;
		}
		return buildDescribeEntry(context, buildingFortificationItems(context));
	},
	buildOnDamageTitle(mode, { info, targetLabel }) {
		const summaryTarget = info.icon || info.label;
		const describeTarget = targetLabel;
		return mode === 'summarize'
			? `On opponent ${summaryTarget} destruction`
			: `On opponent ${describeTarget} destruction`;
	},
	buildEvaluationEntry(log, context) {
		const { stats, targetLabel } = context;
		const power = stats.power;
		const absorption = stats.absorption;
		const fort = stats.fortification;
		const powerValue = (value: number) =>
			power?.icon
				? `${power.icon}${formatNumber(value)}`
				: power
					? `${power.label} ${formatNumber(value)}`
					: `Attack ${formatNumber(value)}`;
		const absorptionValue = (value: number) =>
			absorption?.icon
				? `${absorption.icon}${formatPercent(value)}`
				: absorption
					? `${absorption.label} ${formatPercent(value)}`
					: `Absorption ${formatPercent(value)}`;
		const fortValue = (value: number) =>
			fort?.icon
				? `${fort.icon}${formatNumber(value)}`
				: fort
					? `${fort.label} ${formatNumber(value)}`
					: `Fortification ${formatNumber(value)}`;
		const absorptionLabel = absorption
			? iconLabel(absorption.icon, absorption.label)
			: 'damage reduction';
		const fortLabel = fort ? iconLabel(fort.icon, fort.label) : 'fortification';
		const target = log.target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'building' }
		>;
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

		const title = `Damage evaluation: ${powerValue(
			log.power.modified,
		)} vs. ${absorptionPart} ${fortPart} ${targetLabel}`;
		const items: SummaryEntry[] = [];

		if (log.absorption.ignored) {
			items.push(
				`${powerValue(log.power.modified)} ignores ${absorptionLabel}`,
			);
		} else {
			items.push(
				`${powerValue(log.power.modified)} vs. ${absorptionValue(
					log.absorption.before,
				)} --> ${powerValue(log.absorption.damageAfter)}`,
			);
		}

		if (log.fortification.ignored) {
			items.push(
				`${powerValue(log.absorption.damageAfter)} bypasses ${fortLabel}`,
			);
		} else {
			const remaining = Math.max(
				0,
				log.absorption.damageAfter - log.fortification.damage,
			);
			items.push(
				`${powerValue(log.absorption.damageAfter)} vs. ${fortValue(
					log.fortification.before,
				)} --> ${fortValue(log.fortification.after)} ${powerValue(remaining)}`,
			);
		}

		if (!target.existed) {
			items.push(`No ${targetLabel} to destroy`);
		} else {
			const damageText = powerValue(target.damage);
			items.push(
				target.destroyed
					? `${damageText} destroys ${targetLabel}`
					: `${damageText} fails to destroy ${targetLabel}`,
			);
		}

		return { title, items };
	},
	formatDiff(prefix, diff, options) {
		return formatDiffCommon(prefix, diff, options);
	},
	onDamageLogTitle(info) {
		const display = iconLabel(info.icon, info.label);
		return `${display} destruction trigger evaluation`;
	},
};

export default buildingFormatter;
