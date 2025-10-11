import {
type AttackLog,
type AttackPlayerDiff,
type EffectDef,
} from '@kingdom-builder/protocol';
import type { SummaryEntry } from '../../../content';
import type { TranslationContext } from '../../../context';

export type Mode = 'summarize' | 'describe';

export type TargetInfo = { icon: string; label: string };

export type AttackTarget =
| { type: 'resource'; key: string }
| { type: 'stat'; key: string }
| { type: 'building'; id: string };

export type AttackStatRole = 'power' | 'absorption' | 'fortification';

export type AttackStatDescriptor = {
role: AttackStatRole;
label: string;
icon?: string;
key?: string;
};

export type AttackStatContext = Partial<
	Record<AttackStatRole, AttackStatDescriptor>
>;

export const DEFAULT_ATTACK_STAT_LABELS: Record<AttackStatRole, string> = {
	power: 'Attack Power',
	absorption: 'Absorption',
	fortification: 'Fortification',
};

export type BaseEntryContext<TTarget extends AttackTarget> = {
	mode: Mode;
	stats: AttackStatContext;
	info: TargetInfo;
	target: TTarget;
	targetLabel: string;
	ignoreAbsorption: boolean;
	ignoreFortification: boolean;
};

export type OnDamageTitleContext<TTarget extends AttackTarget> = {
	info: TargetInfo;
	target: TTarget;
	targetLabel: string;
};

export type EvaluationContext<TTarget extends AttackTarget> = {
	stats: AttackStatContext;
	info: TargetInfo;
	target: TTarget;
	targetLabel: string;
};

export type DiffFormatOptions = {
	percent?: number;
	showPercent?: boolean;
};

export interface AttackTargetFormatter<
TTarget extends AttackTarget = AttackTarget,
> {
readonly type: TTarget['type'];
parseEffectTarget(
effect: EffectDef<Record<string, unknown>>,
context: TranslationContext,
): TTarget;
normalizeLogTarget(
target: AttackLog['evaluation']['target'],
context: TranslationContext,
): TTarget;
getInfo(target: TTarget, context: TranslationContext): TargetInfo;
getTargetLabel(
info: TargetInfo,
target: TTarget,
context: TranslationContext,
): string;
	buildBaseEntry(context: BaseEntryContext<TTarget>): SummaryEntry;
	buildOnDamageTitle(
		mode: Mode,
		context: OnDamageTitleContext<TTarget>,
	): string;
buildEvaluationEntry(
log: AttackLog['evaluation'],
context: EvaluationContext<TTarget>,
): SummaryEntry;
formatDiff(
prefix: string,
diff: AttackPlayerDiff,
translationContext: TranslationContext,
options?: DiffFormatOptions,
): string;
onDamageLogTitle(
info: TargetInfo,
target: TTarget,
context: TranslationContext,
): string;
}
