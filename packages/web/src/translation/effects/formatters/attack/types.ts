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
		translation: TranslationContext,
	): TTarget;
	normalizeLogTarget(
		target: AttackLog['evaluation']['target'],
		translation: TranslationContext,
	): TTarget;
	getInfo(target: TTarget, translation: TranslationContext): TargetInfo;
	getTargetLabel(
		info: TargetInfo,
		target: TTarget,
		translation: TranslationContext,
	): string;
	buildBaseEntry(
		context: BaseEntryContext<TTarget>,
		translation: TranslationContext,
	): SummaryEntry;
	buildOnDamageTitle(
		mode: Mode,
		context: OnDamageTitleContext<TTarget>,
		translation: TranslationContext,
	): string;
	buildEvaluationEntry(
		log: AttackLog['evaluation'],
		context: EvaluationContext<TTarget>,
		translation: TranslationContext,
	): SummaryEntry;
	formatDiff(
		prefix: string,
		diff: AttackPlayerDiff,
		options?: DiffFormatOptions,
		translation?: TranslationContext,
	): string;
	onDamageLogTitle(
		info: TargetInfo,
		target: TTarget,
		translation: TranslationContext,
	): string;
}
