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
	selectAttackDefaultResourceKey,
	selectAttackResourceDescriptor,
} from './registrySelectors';

const resourceFormatter: AttackTargetFormatter<{
	type: 'resource';
	key: string;
}> = {
	type: 'resource',
	parseEffectTarget(effect, translation) {
		const targetParam = effect.params?.['target'] as
			| { type: 'resource'; key: string }
			| undefined;
		if (targetParam?.type === 'resource') {
			return targetParam;
		}
		const fallbackKey = selectAttackDefaultResourceKey(translation);
		return { type: 'resource', key: fallbackKey ?? 'unknown_resource' };
	},
	normalizeLogTarget(target, _translation) {
		const resourceTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'resource' }
		>;
		return { type: 'resource', key: String(resourceTarget.key) };
	},
	getInfo(target, translation) {
		return selectAttackResourceDescriptor(translation, target.key);
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
		return buildStandardEvaluationEntry(log, context, false);
	},
	formatDiff(prefix, diff, options, translation) {
		return formatDiffCommon(prefix, diff, options, translation);
	},
	onDamageLogTitle(info, _target, _translation) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default resourceFormatter;
