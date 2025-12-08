import type { AttackLog } from '@kingdom-builder/protocol';
import {
	attackResourceLabel,
	attackResourceValue,
	formatDiffCommon,
	formatNumber,
	formatPercent,
	formatSignedValue,
	iconLabel,
} from './shared';
import { buildAttackSummaryBullet } from './summary';
import { buildDescribeEntry, buildingFortificationItems } from './evaluation';
import type { AttackTargetFormatter } from './types';
import type { SummaryEntry } from '../../../content';
import { selectAttackBuildingDescriptor } from './registrySelectors';

const buildingFormatter: AttackTargetFormatter<{
	type: 'building';
	id: string;
}> = {
	type: 'building',
	parseEffectTarget(effect, _context) {
		const targetParam = effect.params?.['target'] as
			| { type: 'building'; id: string }
			| undefined;
		if (targetParam?.type === 'building') {
			return targetParam;
		}
		return { type: 'building', id: 'unknown_building' };
	},
	normalizeLogTarget(target) {
		const buildingTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'building' }
		>;
		return { type: 'building', id: buildingTarget.id };
	},
	getInfo(target, context) {
		return selectAttackBuildingDescriptor(context, target.id);
	},
	getTargetLabel(info) {
		return iconLabel(info.icon, info.label);
	},
	buildBaseEntry(context) {
		if (context.mode === 'summarize') {
			return buildAttackSummaryBullet(context);
		}
		return buildDescribeEntry(context, buildingFortificationItems(context));
	},
	buildOnDamageTitle(mode, { info, targetLabel }) {
		const summaryTarget = info.icon || info.label || targetLabel;
		if (mode === 'summarize') {
			return `${summaryTarget}💥`;
		}
		return `On opponent ${targetLabel} destruction`;
	},
	buildEvaluationEntry(log, context) {
		const { stats, targetLabel } = context;
		const power = stats.power;
		const absorption = stats.absorption;
		const fort = stats.fortification;
		const powerValue = (value: number) =>
			attackResourceValue(power, formatSignedValue(value, formatNumber));
		const absorptionValue = (value: number) =>
			attackResourceValue(absorption, formatSignedValue(value, formatPercent));
		const fortValue = (value: number) =>
			attackResourceValue(fort, formatSignedValue(value, formatNumber));
		const absorptionLabel = attackResourceLabel(absorption);
		const fortLabel = attackResourceLabel(fort);
		const target = log.target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'building' }
		>;
		const powerModified = powerValue(log.power.modified);
		const absorptionBefore = absorptionValue(log.absorption.before);
		const powerAfterAbsorption = powerValue(log.absorption.damageAfter);
		const fortBefore = fortValue(log.fortification.before);
		const fortAfter = fortValue(log.fortification.after);
		const remainingAfterFort = Math.max(
			0,
			log.absorption.damageAfter - log.fortification.damage,
		);
		const remainingPower = powerValue(remainingAfterFort);
		const damageText = powerValue(target.damage);
		const titleSegments: string[] = [];

		if (log.absorption.ignored) {
			titleSegments.push(
				absorptionLabel
					? `Ignore ${absorptionLabel} with ${powerModified}`
					: `Ignore absorption with ${powerModified}`,
			);
		} else {
			titleSegments.push(
				`Compare ${powerModified} against ${absorptionBefore}`,
			);
		}

		if (log.fortification.ignored) {
			titleSegments.push(
				fortLabel
					? `Bypass ${fortLabel} with ${powerAfterAbsorption}`
					: `Bypass fortification with ${powerAfterAbsorption}`,
			);
		} else {
			titleSegments.push(`Compare remaining damage against ${fortBefore}`);
		}

		if (!target.existed) {
			titleSegments.push(`Confirm no ${targetLabel} to destroy`);
		} else if (target.destroyed) {
			titleSegments.push(`Destroy ${targetLabel} with ${damageText}`);
		} else {
			titleSegments.push(
				`Damage ${targetLabel} with ${damageText} and leave it standing`,
			);
		}

		const title = `Evaluate damage: ${titleSegments.join('; ')}`;
		const items: SummaryEntry[] = [];

		if (log.absorption.ignored) {
			items.push(
				absorptionLabel
					? `Ignore ${absorptionLabel} with ${powerModified}`
					: `Ignore absorption with ${powerModified}`,
			);
		} else {
			items.push(
				`Compare ${powerModified} against ${absorptionBefore} → ${powerAfterAbsorption}`,
			);
		}

		if (log.fortification.ignored) {
			items.push(
				fortLabel
					? `Bypass ${fortLabel} with ${powerAfterAbsorption}`
					: `Bypass fortification with ${powerAfterAbsorption}`,
			);
		} else {
			items.push(
				`Compare ${powerAfterAbsorption} against ${fortBefore} → ${fortAfter} and carry forward ${remainingPower}`,
			);
		}

		if (!target.existed) {
			items.push(`Confirm no ${targetLabel} to destroy`);
		} else if (target.destroyed) {
			items.push(`Destroy ${targetLabel} with ${damageText}`);
		} else {
			items.push(
				`Apply ${damageText} to ${targetLabel} and fail to destroy it`,
			);
		}

		return { title, items };
	},
	formatDiff(prefix, diff, context, options) {
		return formatDiffCommon(prefix, diff, context, options);
	},
	onDamageLogTitle(info) {
		const display = iconLabel(info.icon, info.label);
		return `${display} destruction trigger evaluation`;
	},
};

export default buildingFormatter;
