import type { AttackLog } from '@kingdom-builder/protocol';
import { formatDiffCommon, iconLabel } from './shared';
import { buildAttackSummaryBullet } from './summary';
import {
	buildDescribeEntry,
	buildStandardEvaluationEntry,
	defaultFortificationItems,
} from './evaluation';
import type { AttackTargetFormatter } from './types';
import { selectAttackResourceDescriptor } from './registrySelectors';

const resourceFormatter: AttackTargetFormatter<{
	type: 'resource';
	key: string;
}> = {
	type: 'resource',
	parseEffectTarget(effect) {
		const targetParam = effect.params?.['target'] as
			| { type: 'resource'; key: string }
			| undefined;
		if (targetParam?.type === 'resource') {
			return targetParam;
		}
		return { type: 'resource', key: 'resource' };
	},
	normalizeLogTarget(target) {
		const resourceTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'resource' }
		>;
		return { type: 'resource', key: String(resourceTarget.key) };
	},
	getInfo(translationContext, target) {
		return selectAttackResourceDescriptor(translationContext, target.key);
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
		return buildStandardEvaluationEntry(log, context, false);
	},
	formatDiff(prefix, diff, translationContext, options) {
		return formatDiffCommon(translationContext, prefix, diff, options);
	},
	onDamageLogTitle(info, _target, _translationContext) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default resourceFormatter;
