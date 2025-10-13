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
import type { TranslationContext } from '../../../context';

function resolveDefaultResourceKey(context: TranslationContext): string {
	const assetKeys = Object.keys(context.assets.resources ?? {});
	if (assetKeys.length > 0) {
		return assetKeys[0]!;
	}
	const playerKeys = Object.keys(context.activePlayer.resources ?? {});
	if (playerKeys.length > 0) {
		return playerKeys[0]!;
	}
	const opponentKeys = Object.keys(context.opponent.resources ?? {});
	if (opponentKeys.length > 0) {
		return opponentKeys[0]!;
	}
	return 'resource';
}

const resourceFormatter: AttackTargetFormatter<{
	type: 'resource';
	key: string;
}> = {
	type: 'resource',
	parseEffectTarget(effect, translationContext) {
		const targetParam = effect.params?.['target'] as
			| { type: 'resource'; key: string }
			| undefined;
		if (targetParam?.type === 'resource') {
			return targetParam;
		}
		return {
			type: 'resource',
			key: resolveDefaultResourceKey(translationContext),
		};
	},
	normalizeLogTarget(target, translationContext) {
		const resourceTarget = target as Extract<
			AttackLog['evaluation']['target'],
			{ type: 'resource' }
		>;
		const key =
			typeof resourceTarget.key === 'string'
				? resourceTarget.key
				: resolveDefaultResourceKey(translationContext);
		return { type: 'resource', key };
	},
	getInfo(target, translationContext) {
		return selectAttackResourceDescriptor(translationContext, target.key);
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
		return buildStandardEvaluationEntry(log, context, false);
	},
	formatDiff(prefix, diff, translationContext, options) {
		return formatDiffCommon(prefix, diff, translationContext, options);
	},
	onDamageLogTitle(info) {
		return `${info.icon} ${info.label} damage trigger evaluation`;
	},
};

export default resourceFormatter;
