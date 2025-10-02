import {
	RESOURCES,
	Resource,
	type ResourceKey,
} from '@kingdom-builder/contents';
import type { AttackLog } from '@kingdom-builder/engine';
import {
	buildDescribeEntry,
	buildStandardEvaluationEntry,
	defaultFortificationItems,
	formatDiffCommon,
	iconLabel,
} from './shared';
import type { AttackTargetFormatter } from './types';

const resourceFormatter: AttackTargetFormatter<{
	type: 'resource';
	key: ResourceKey;
}> = {
	type: 'resource',
	parseEffectTarget(effect) {
		const targetParam = effect.params?.['target'] as
			| { type: 'resource'; key: ResourceKey }
			| undefined;
		if (targetParam?.type === 'resource') {
			return targetParam;
		}
		return { type: 'resource', key: Resource.castleHP };
	},
	normalizeLogTarget(target) {
		const resourceTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'resource' }
		>;
		return { type: 'resource', key: resourceTarget.key as ResourceKey };
	},
	getInfo(target) {
		return RESOURCES[target.key];
	},
	getTargetLabel(info) {
		return iconLabel(info.icon, info.label);
	},
	buildBaseEntry(context) {
		if (context.mode === 'summarize') {
			return `${context.army.icon} opponent's ${context.fort.icon}${context.info.icon}`;
		}
		return buildDescribeEntry(context, defaultFortificationItems(context));
	},
	buildOnDamageTitle(mode, { info }) {
		return mode === 'summarize'
			? `On opponent ${info.icon} damage`
			: `On opponent ${info.icon} ${info.label} damage`;
	},
	buildEvaluationEntry(log, context) {
		return buildStandardEvaluationEntry(log, context, false);
	},
	formatDiff(prefix, diff, options) {
		return formatDiffCommon(prefix, diff, options);
	},
	onDamageLogTitle(info) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default resourceFormatter;
