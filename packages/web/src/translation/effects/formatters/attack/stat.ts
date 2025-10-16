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

const statFormatter: AttackTargetFormatter<{
	type: 'stat';
	key: string;
}> = {
	type: 'stat',
	parseEffectTarget(effect, translation) {
		const targetParam = effect.params?.['target'] as
			| { type: 'stat'; key: string }
			| undefined;
		if (targetParam?.type === 'stat') {
			return targetParam;
		}
		const fallbackKey = selectAttackDefaultStatKey(translation);
		if (!fallbackKey) {
			throw new Error('No stat definitions available');
		}
		return { type: 'stat', key: fallbackKey };
	},
	normalizeLogTarget(target, _translation) {
		const statTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'stat' }
		>;
		return { type: 'stat', key: String(statTarget.key) };
	},
	getInfo(target, translation) {
		return selectAttackStatDescriptor(translation, target.key);
	},
	getTargetLabel(info, _target, _translation) {
		return iconLabel(info.icon, info.label);
	},
	buildBaseEntry(context, _translation) {
		if (context.mode === 'summarize') {
			return buildAttackSummaryBullet(context);
		}
		return buildDescribeEntry(context, defaultFortificationItems(context));
	},
	buildOnDamageTitle(mode, { info, targetLabel }, _translation) {
		const summaryTarget = info.icon || info.label || targetLabel;
		if (mode === 'summarize') {
			return `${summaryTarget}💥`;
		}
		return `On opponent ${info.icon} ${info.label} damage`;
	},
	buildEvaluationEntry(log, context, _translation) {
		return buildStandardEvaluationEntry(log, context, true);
	},
	formatDiff(prefix, diff, options, translation) {
		return formatDiffCommon(prefix, diff, options, translation);
	},
	onDamageLogTitle(info, _target, _translation) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default statFormatter;
