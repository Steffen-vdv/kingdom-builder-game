import type {
	ActionEffectGroup,
	ActionEffectGroupChoiceMap,
	ActionEffectGroupOption,
	EffectDef,
	EngineContext,
} from '@kingdom-builder/engine';
import type { SummaryEntry } from '../content';
// Effect and evaluator formatter registries drive translation lookups.

export interface EffectFormatter {
	summarize?: (
		effect: EffectDef<Record<string, unknown>>,
		context: EngineContext,
	) => SummaryEntry | SummaryEntry[] | null;
	describe?: (
		effect: EffectDef<Record<string, unknown>>,
		context: EngineContext,
	) => SummaryEntry | SummaryEntry[] | null;
	log?: (
		effect: EffectDef<Record<string, unknown>>,
		context: EngineContext,
	) => SummaryEntry | SummaryEntry[] | null;
}

const EFFECT_FORMATTERS = new Map<string, EffectFormatter>();
const EVALUATOR_FORMATTERS = new Map<string, EvaluatorFormatter>();

export function registerEffectFormatter(
	type: string,
	method: string,
	formatter: EffectFormatter,
): void {
	EFFECT_FORMATTERS.set(`${type}:${method}`, formatter);
}

export interface EvaluatorFormatter {
	summarize?: (
		evaluator: { type: string; params: Record<string, unknown> },
		subEntries: SummaryEntry[],
		context: EngineContext,
	) => SummaryEntry[];
	describe?: (
		evaluator: { type: string; params: Record<string, unknown> },
		subEntries: SummaryEntry[],
		context: EngineContext,
	) => SummaryEntry[];
	log?: (
		evaluator: { type: string; params: Record<string, unknown> },
		subEntries: SummaryEntry[],
		context: EngineContext,
	) => SummaryEntry[];
}

export function registerEvaluatorFormatter(
	type: string,
	formatter: EvaluatorFormatter,
): void {
	EVALUATOR_FORMATTERS.set(type, formatter);
}

function applyFormatter(
	effect: EffectDef<Record<string, unknown>>,
	context: EngineContext,
	mode: 'summarize' | 'describe' | 'log',
): SummaryEntry[] {
	const key = `${effect.type}:${effect.method ?? ''}`;
	const handler = EFFECT_FORMATTERS.get(key);
	if (!handler) {
		return [];
	}
	const formatterFn = handler[mode];
	if (!formatterFn) {
		return [];
	}
	const result = formatterFn(effect, context);
	if (!result) {
		return [];
	}
	if (Array.isArray(result)) {
		return result;
	}
	return [result];
}

export function summarizeEffects(
	effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
	context: EngineContext,
): SummaryEntry[] {
	const parts: SummaryEntry[] = [];
	for (const effectDef of effects || []) {
		if (effectDef.evaluator) {
			const evaluator = effectDef.evaluator as {
				type: string;
				params: Record<string, unknown>;
			};
			const subEntries = summarizeEffects(effectDef.effects, context);
			const handler = EVALUATOR_FORMATTERS.get(evaluator.type);
			if (handler?.summarize) {
				const formattedSummaries = handler.summarize(
					evaluator,
					subEntries,
					context,
				);
				parts.push(...formattedSummaries);
			} else {
				parts.push(...subEntries);
			}
			continue;
		}
		parts.push(...applyFormatter(effectDef, context, 'summarize'));
	}
	return parts.map((part) => {
		if (typeof part === 'string') {
			return part.trim();
		}
		return part;
	});
}

export function describeEffects(
	effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
	context: EngineContext,
): SummaryEntry[] {
	const parts: SummaryEntry[] = [];
	for (const effectDef of effects || []) {
		if (effectDef.evaluator) {
			const evaluator = effectDef.evaluator as {
				type: string;
				params: Record<string, unknown>;
			};
			const subEntries = describeEffects(effectDef.effects, context);
			const handler = EVALUATOR_FORMATTERS.get(evaluator.type);
			if (handler?.describe) {
				const formattedDescriptions = handler.describe(
					evaluator,
					subEntries,
					context,
				);
				parts.push(...formattedDescriptions);
			} else {
				parts.push(...subEntries);
			}
			continue;
		}
		parts.push(...applyFormatter(effectDef, context, 'describe'));
	}
	return parts.map((part) => {
		if (typeof part === 'string') {
			return part.trim();
		}
		return part;
	});
}

export function logEffects(
	effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
	context: EngineContext,
): SummaryEntry[] {
	const parts: SummaryEntry[] = [];
	for (const effectDef of effects || []) {
		if (effectDef.evaluator) {
			const evaluator = effectDef.evaluator as {
				type: string;
				params: Record<string, unknown>;
			};
			const subEntries = logEffects(effectDef.effects, context);
			const handler = EVALUATOR_FORMATTERS.get(evaluator.type);
			if (handler?.log) {
				const formattedLogEntries = handler.log(evaluator, subEntries, context);
				parts.push(...formattedLogEntries);
			} else {
				parts.push(...subEntries);
			}
			continue;
		}
		parts.push(...applyFormatter(effectDef, context, 'log'));
	}
	return parts.map((part) => {
		if (typeof part === 'string') {
			return part.trim();
		}
		return part;
	});
}

type EffectGroupMode = 'summarize' | 'describe' | 'log';

function buildOptionEntry(
	option: ActionEffectGroupOption,
	mode: EffectGroupMode,
): SummaryEntry {
	const title = [option.icon, option.label].filter(Boolean).join(' ').trim();
	const detailItems: SummaryEntry[] = [];
	if (mode !== 'log' && option.summary) {
		detailItems.push(option.summary);
	}
	if (mode === 'describe' && option.description) {
		if (!option.summary || option.summary !== option.description) {
			detailItems.push(option.description);
		}
	}
	if (mode === 'log') {
		const detail = option.summary || option.description;
		if (detail) {
			detailItems.push(detail);
		}
	}
	if (detailItems.length === 0 || !title) {
		return title || option.label;
	}
	return { title, items: detailItems };
}

function buildGroupEntry(
	group: ActionEffectGroup,
	mode: EffectGroupMode,
	selection?: ActionEffectGroupOption,
): SummaryEntry {
	const title =
		[group.icon, group.title].filter(Boolean).join(' ').trim() || group.id;
	const items: SummaryEntry[] = [];
	if (mode !== 'log' && group.summary) {
		items.push(group.summary);
	}
	if (mode === 'describe' && group.description) {
		if (!group.summary || group.summary !== group.description) {
			items.push(group.description);
		}
	}
	if (mode === 'log') {
		const detail = group.summary || group.description;
		if (detail) {
			items.push(detail);
		}
	}
	const options = selection ? [selection] : group.options;
	for (const option of options) {
		items.push(buildOptionEntry(option, mode));
	}
	return { title, items };
}

export function formatEffectGroups(
	groups: readonly ActionEffectGroup[] | undefined,
	mode: EffectGroupMode,
	choices?: ActionEffectGroupChoiceMap,
): SummaryEntry[] {
	if (!groups || groups.length === 0) {
		return [];
	}
	const entries: SummaryEntry[] = [];
	for (const group of groups) {
		const selection = choices?.[group.id];
		if (selection) {
			const option = group.options.find(
				(candidate) => candidate.id === selection.optionId,
			);
			if (option) {
				entries.push(buildGroupEntry(group, mode, option));
				continue;
			}
		}
		entries.push(buildGroupEntry(group, mode));
	}
	return entries;
}
