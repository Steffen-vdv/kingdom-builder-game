import { Stat, type StatKey } from '@kingdom-builder/contents';
import type { AttackLog } from '@kingdom-builder/protocol';
import { formatDiffCommon, iconLabel } from './shared';
import { buildAttackSummaryBullet } from './summary';
import {
	buildDescribeEntry,
	buildStandardEvaluationEntry,
	defaultFortificationItems,
} from './evaluation';
import type { AttackTargetFormatter } from './types';
import { selectAttackStatDescriptor } from './registrySelectors';

const statFormatter: AttackTargetFormatter<{
	type: 'stat';
	key: StatKey;
}> = {
	type: 'stat',
	parseEffectTarget(effect, _context) {
		const targetParam = effect.params?.['target'] as
			| { type: 'stat'; key: StatKey }
			| undefined;
		if (targetParam?.type === 'stat') {
			return targetParam;
		}
		const fallbackKey = Stat.armyStrength as StatKey;
		return { type: 'stat', key: fallbackKey };
	},
	normalizeLogTarget(target) {
		const statTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'stat' }
		>;
		return { type: 'stat', key: statTarget.key as StatKey };
	},
	getInfo(target, context) {
		return selectAttackStatDescriptor(context, target.key);
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
	formatDiff(prefix, diff, context, options) {
		return formatDiffCommon(prefix, diff, context, options);
	},
	onDamageLogTitle(info) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default statFormatter;
