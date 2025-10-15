import type { ResourceKey } from '@kingdom-builder/contents';
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

const resourceFormatter: AttackTargetFormatter<{
	type: 'resource';
	key: ResourceKey;
}> = {
	type: 'resource',
        parseEffectTarget(effect, context) {
                const targetParam = effect.params?.['target'] as
                        | { type: 'resource'; key: ResourceKey }
                        | undefined;
                if (targetParam?.type === 'resource') {
                        return targetParam;
                }
                const fallbackKey = context.assets.resources
                        ? (Object.keys(context.assets.resources)[0] as ResourceKey | undefined)
                        : undefined;
                return {
                        type: 'resource',
                        key: fallbackKey ?? ('castleHP' as ResourceKey),
                };
        },
        normalizeLogTarget(target) {
                const resourceTarget = target as Extract<
                        AttackLog['evaluation']['target'],
                        { type: 'resource' }
                >;
                return { type: 'resource', key: resourceTarget.key as ResourceKey };
        },
        getInfo(target, context) {
                return selectAttackResourceDescriptor(context, target.key);
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
        formatDiff(prefix, diff, options, translationContext) {
                const contextRef = translationContext as TranslationContext | undefined;
                if (!contextRef) {
                        throw new Error('Translation context required for resource diff.');
                }
                return formatDiffCommon(prefix, diff, options, contextRef);
        },
        onDamageLogTitle(info, _target, context) {
                return `${info.icon} ${info.label} damage trigger evaluation`.trim();
        },
};

export default resourceFormatter;
