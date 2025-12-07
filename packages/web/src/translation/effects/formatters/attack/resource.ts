import type { AttackLog } from '@kingdom-builder/protocol';
import { formatDiffCommon, iconLabel } from './shared';
import { buildAttackSummaryBullet } from './summary';
import {
	buildDescribeEntry,
	buildStandardEvaluationEntry,
	defaultFortificationItems,
} from './evaluation';
import type { AttackTargetFormatter, AttackResourceKey } from './types';
import { selectAttackResourceDescriptor } from './registrySelectors';
import { DEFAULT_ATTACK_RESOURCE_KEY } from './defaultKeys';

const resourceFormatter: AttackTargetFormatter<{
	type: 'resource';
	resourceId: AttackResourceKey;
}> = {
	type: 'resource',
	parseEffectTarget(effect, _context) {
		const targetParam = effect.params?.['target'] as
			| { type: 'resource'; resourceId: AttackResourceKey }
			| undefined;
		if (targetParam?.type === 'resource') {
			return targetParam;
		}
		return { type: 'resource', resourceId: DEFAULT_ATTACK_RESOURCE_KEY };
	},
	normalizeLogTarget(target) {
		const resourceTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'resource' }
		>;
		return { type: 'resource', resourceId: resourceTarget.resourceId };
	},
	getInfo(target, context) {
		return selectAttackResourceDescriptor(context, target.resourceId);
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
	formatDiff(prefix, diff, context, options) {
		return formatDiffCommon(prefix, diff, context, options);
	},
	onDamageLogTitle(info) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default resourceFormatter;
