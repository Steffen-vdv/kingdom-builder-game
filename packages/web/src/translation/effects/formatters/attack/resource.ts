import type { AttackLog } from '@kingdom-builder/protocol';
import { formatDiffCommon, iconLabel } from './shared';
import { buildAttackSummaryBullet } from './summary';
import {
        buildDescribeEntry,
        buildStandardEvaluationEntry,
        defaultFortificationItems,
} from './evaluation';
import type { AttackTargetFormatter } from './types';
import { selectResourceInfo } from './descriptorSelectors';
import type { TranslationContext } from '../../context';

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
                const fallbackKey =
                        translationContext.actionCostResource ??
                        Object.keys(translationContext.assets.resources)[0] ??
                        'unknown_resource';
                return { type: 'resource', key: fallbackKey };
        },
        normalizeLogTarget(target, _translationContext) {
                const resourceTarget = target as Extract<
                        AttackLog['evaluation']['target'],
                        { type: 'resource' }
                >;
                return { type: 'resource', key: String(resourceTarget.key) };
        },
        getInfo(target, translationContext) {
                return selectResourceInfo(translationContext, target.key);
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
                return formatDiffCommon(prefix, diff, translationContext, options);
        },
        onDamageLogTitle(info) {
                return `${info.icon} ${info.label} damage trigger evaluation`;
        },
};

export default resourceFormatter;
