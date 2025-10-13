import type { AttackLog } from '@kingdom-builder/protocol';
import {
	attackStatLabel,
	attackStatValue,
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
import type { TranslationContext } from '../../../context';

const buildingFormatter: AttackTargetFormatter<{
	type: 'building';
	id: string;
}> = {
	type: 'building',
	parseEffectTarget(effect, _translationContext: TranslationContext) {
		const targetParam = effect.params?.['target'] as
			| { type: 'building'; id: string }
			| undefined;
		if (targetParam?.type === 'building') {
			return targetParam;
		}
		return { type: 'building', id: 'unknown_building' };
	},
	normalizeLogTarget(target, _translationContext: TranslationContext) {
		const buildingTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'building' }
		>;
		return { type: 'building', id: buildingTarget.id };
	},
	getInfo(target, translationContext) {
		return selectAttackBuildingDescriptor(translationContext, target.id);
	},
	getTargetLabel(info) {
		return iconLabel(info.icon, info.label);
	},
	buildBaseEntry(context, _translationContext: TranslationContext) {
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
	buildEvaluationEntry(log, context, _translationContext: TranslationContext) {
		const { stats, targetLabel } = context;
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
			titleSegments.push(`Ignore ${absorptionLabel} with ${powerModified}`);
		} else {
			titleSegments.push(
				`Compare ${powerModified} against ${absorptionBefore}`,
			);
		}

		if (log.fortification.ignored) {
			titleSegments.push(`Bypass ${fortLabel} with ${powerAfterAbsorption}`);
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
	formatDiff(prefix, diff, translationContext, options) {
		return formatDiffCommon(prefix, diff, translationContext, options);
	},
	onDamageLogTitle(info) {
		const display = iconLabel(info.icon, info.label);
		return `${display} destruction trigger evaluation`;
	},
};

export default buildingFormatter;
