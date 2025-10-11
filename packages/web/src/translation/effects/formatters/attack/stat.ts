import type { AttackLog } from '@kingdom-builder/protocol';
import { formatDiffCommon, iconLabel } from './shared';
import { buildAttackSummaryBullet } from './summary';
import {
        buildDescribeEntry,
        buildStandardEvaluationEntry,
        defaultFortificationItems,
} from './evaluation';
import type { AttackTargetFormatter } from './types';
import { selectStatInfo } from './descriptorSelectors';
import type { TranslationContext } from '../../context';

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
                const fallbackKey =
                        Object.keys(translationContext.assets.stats)[0] ?? 'unknown_stat';
                return { type: 'stat', key: fallbackKey };
        },
        normalizeLogTarget(target, _translationContext) {
                const statTarget = target as Extract<
                        AttackLog['evaluation']['target'],
                        { type: 'stat' }
                >;
                return { type: 'stat', key: String(statTarget.key) };
        },
        getInfo(target, translationContext) {
                return selectStatInfo(translationContext, target.key);
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
        formatDiff(prefix, diff, translationContext, options) {
                return formatDiffCommon(prefix, diff, translationContext, options);
        },
        onDamageLogTitle(info) {
                return `${info.icon} ${info.label} damage trigger evaluation`;
        },
};

export default statFormatter;
