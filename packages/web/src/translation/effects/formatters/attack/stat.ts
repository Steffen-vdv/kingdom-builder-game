import { STATS, type StatKey } from '@kingdom-builder/contents';
import type { AttackLog } from '@kingdom-builder/protocol';
import { formatDiffCommon, iconLabel } from './shared';
import { buildAttackSummaryBullet } from './summary';
import {
	buildDescribeEntry,
	buildStandardEvaluationEntry,
	defaultFortificationItems,
} from './evaluation';
import type { AttackTargetFormatter } from './types';

const statFormatter: AttackTargetFormatter<{
	type: 'stat';
	key: StatKey;
}> = {
	type: 'stat',
	parseEffectTarget(effect) {
		const targetParam = effect.params?.['target'] as
			| { type: 'stat'; key: StatKey }
			| undefined;
		if (targetParam?.type === 'stat') {
			return targetParam;
		}
		const fallbackKey = Object.keys(STATS)[0] as StatKey | undefined;
		if (!fallbackKey) {
			throw new Error('No stat definitions available');
		}
		return { type: 'stat', key: fallbackKey };
	},
	normalizeLogTarget(target) {
		const statTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'stat' }
		>;
		return { type: 'stat', key: statTarget.key as StatKey };
	},
	getInfo(target) {
		return STATS[target.key];
	},
	getTargetLabel(info) {
		return iconLabel(info.icon, info.label);
	},
	buildBaseEntry(context) {
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
	buildEvaluationEntry(log, context) {
		return buildStandardEvaluationEntry(log, context, true);
	},
	formatDiff(prefix, diff, options) {
		return formatDiffCommon(prefix, diff, options);
	},
	onDamageLogTitle(info) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default statFormatter;
