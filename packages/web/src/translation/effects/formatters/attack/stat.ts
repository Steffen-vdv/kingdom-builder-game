import type { AttackLog } from '@kingdom-builder/protocol';
import { formatDiffCommon, iconLabel } from './shared';
import { buildAttackSummaryBullet } from './summary';
import {
	buildDescribeEntry,
	buildStandardEvaluationEntry,
	defaultFortificationItems,
} from './evaluation';
import type { AttackTargetFormatter } from './types';
import {
	selectAttackDefaultStatKey,
	selectAttackStatDescriptor,
} from './registrySelectors';
import type { TranslationContext } from '../../../context';

const statFormatter: AttackTargetFormatter<{
	type: 'stat';
	key: string;
}> = {
	type: 'stat',
	parseEffectTarget(effect, translationContext) {
		const targetParam = effect.params?.['target'] as
			| { type: 'stat'; key: string }
			| undefined;
		if (targetParam?.type === 'stat') {
			return targetParam;
		}
		const fallbackKey = selectAttackDefaultStatKey(translationContext);
		if (!fallbackKey) {
			throw new Error('No stat definitions available');
		}
		return { type: 'stat', key: fallbackKey };
	},
	normalizeLogTarget(target, translationContext) {
		const statTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'stat' }
		>;
		const key =
			typeof statTarget.key === 'string'
				? statTarget.key
				: selectAttackDefaultStatKey(translationContext);
		if (!key) {
			throw new Error('No stat definitions available');
		}
		return { type: 'stat', key };
	},
	getInfo(target, translationContext) {
		return selectAttackStatDescriptor(translationContext, target.key);
	},
	getTargetLabel(info) {
		return iconLabel(info.icon, info.label);
	},
	buildBaseEntry(context, _translationContext: TranslationContext) {
		if (context.mode === 'summarize') {
			return buildAttackSummaryBullet(context);
		}
		return buildDescribeEntry(context, defaultFortificationItems(context));
	},
	buildOnDamageTitle(mode, { info, targetLabel }) {
		const summaryTarget = info.icon || info.label || targetLabel;
		if (mode === 'summarize') {
			return `${summaryTarget}💥`;
		}
		return `On opponent ${info.icon} ${info.label} damage`;
	},
	buildEvaluationEntry(log, context, _translationContext: TranslationContext) {
		return buildStandardEvaluationEntry(log, context, true);
	},
	formatDiff(prefix, diff, translationContext, options) {
		return formatDiffCommon(prefix, diff, translationContext, options);
	},
	onDamageLogTitle(info) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default statFormatter;
