import { BUILDINGS } from '@kingdom-builder/contents';
import type { AttackLog } from '@kingdom-builder/engine';
import {
	buildDescribeEntry,
	buildingFortificationItems,
	formatDiffCommon,
	formatNumber,
	formatPercent,
	getBuildingDisplay,
	iconLabel,
} from './shared';
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
			return `${context.army.icon} destroy opponent's ${context.targetLabel}`;
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
		const { army, absorption, fort, targetLabel } = context;
		const target = log.target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'building' }
		>;
		const absorptionPart = log.absorption.ignored
			? `${absorption.icon} ignored`
			: `${absorption.icon}${formatPercent(log.absorption.before)}`;
		const fortPart = log.fortification.ignored
			? `${fort.icon} ignored`
			: `${fort.icon}${formatNumber(log.fortification.before)}`;

		const title = `Damage evaluation: ${army.icon}${formatNumber(
			log.power.modified,
		)} vs. ${absorptionPart} ${fortPart} ${targetLabel}`;
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

		if (!target.existed) {
			items.push(`No ${targetLabel} to destroy`);
		} else {
			const damageText = `${army.icon}${formatNumber(target.damage)}`;
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
		return `${iconLabel(info.icon, info.label)} destruction trigger evaluation`;
	},
};

export default buildingFormatter;
