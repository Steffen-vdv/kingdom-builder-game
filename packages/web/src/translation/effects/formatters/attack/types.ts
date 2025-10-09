import type {
	AttackLog,
	AttackPlayerDiff,
	EffectDef,
} from '@kingdom-builder/protocol';
import type { ResourceKey, StatKey } from '@kingdom-builder/contents';
import type { SummaryEntry } from '../../../content';

export type Mode = 'summarize' | 'describe';

export type TargetInfo = { icon: string; label: string };

export type AttackTarget =
	| { type: 'resource'; key: ResourceKey }
	| { type: 'stat'; key: StatKey }
	| { type: 'building'; id: string };

export type AttackStatRole = 'power' | 'absorption' | 'fortification';

export type AttackStatDescriptor = {
	role: AttackStatRole;
	label: string;
	icon?: string;
	key?: StatKey;
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
	parseEffectTarget(effect: EffectDef<Record<string, unknown>>): TTarget;
	normalizeLogTarget(target: AttackLog['evaluation']['target']): TTarget;
	getInfo(target: TTarget): TargetInfo;
	getTargetLabel(info: TargetInfo, target: TTarget): string;
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
		options?: DiffFormatOptions,
	): string;
	onDamageLogTitle(info: TargetInfo, target: TTarget): string;
}
