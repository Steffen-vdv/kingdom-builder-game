import type {
	ActionEffectGroupOption,
	ResolvedActionEffectGroupOption,
	ResolvedActionEffectStep,
} from '@kingdom-builder/engine';
import type { SummaryEntry } from '../content';
import { describeContent, logContent, summarizeContent } from '../content';
import { buildActionOptionTranslation } from './optionLabel';
import { logEffects } from './factory';
import type { TranslationContext } from '../context';

export type EffectGroupMode = 'summarize' | 'describe' | 'log';

export function mergeOptionParams(
	option: ActionEffectGroupOption,
	baseParams: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...baseParams };
	for (const [key, value] of Object.entries(option.params || {})) {
		if (typeof value === 'string' && value.startsWith('$')) {
			const placeholder = value.slice(1);
			if (placeholder in baseParams) {
				merged[key] = baseParams[placeholder];
			}
			continue;
		}
		merged[key] = value;
	}
	if (
		merged['id'] === undefined &&
		typeof merged['developmentId'] === 'string'
	) {
		merged['id'] = merged['developmentId'];
	}
	return merged;
}

export function buildOptionEntry(
	option: ActionEffectGroupOption,
	mode: EffectGroupMode,
	context: TranslationContext,
	baseParams: Record<string, unknown>,
	selection?: ResolvedActionEffectGroupOption,
): SummaryEntry {
	const mergedParams =
		selection?.params || mergeOptionParams(option, baseParams);

	if (mode === 'log') {
		const translated = selection
			? logEffects(selection.effects, context)
			: logContent('action', option.actionId, context, mergedParams);
		const { entry } = buildActionOptionTranslation(
			option,
			context,
			translated,
			mode,
		);
		return entry;
	}

	const translated =
		mode === 'summarize'
			? summarizeContent('action', option.actionId, context, mergedParams)
			: describeContent('action', option.actionId, context, mergedParams);

	const { entry } = buildActionOptionTranslation(
		option,
		context,
		translated,
		mode,
	);
	return entry;
}

export function buildGroupEntry(
	step: Extract<ResolvedActionEffectStep, { type: 'group' }>,
	mode: EffectGroupMode,
	context: TranslationContext,
): SummaryEntry {
	const { group, selection, params } = step;
	const title =
		[group.icon, group.title || 'Choose one:']
			.filter(Boolean)
			.join(' ')
			.trim() || group.id;
	const items: SummaryEntry[] = [];
	if (mode !== 'log' && group.summary) {
		items.push(group.summary);
	}
	if (mode === 'describe' && group.description) {
		if (!group.summary || group.summary !== group.description) {
			items.push(group.description);
		}
	}
	if (mode === 'log' && group.summary && !selection) {
		items.push(group.summary);
	}
	if (mode === 'log' && group.description && !selection) {
		if (!group.summary || group.summary !== group.description) {
			items.push(group.description);
		}
	}
	if (selection) {
		items.push(
			buildOptionEntry(selection.option, mode, context, params, selection),
		);
	} else {
		for (const option of group.options) {
			items.push(buildOptionEntry(option, mode, context, params));
		}
	}
	return { title, items };
}

export function formatEffectGroups(
	steps: readonly ResolvedActionEffectStep[] | undefined,
	mode: EffectGroupMode,
	context: TranslationContext,
): SummaryEntry[] {
	if (!steps || steps.length === 0) {
		return [];
	}
	const entries: SummaryEntry[] = [];
	for (const step of steps) {
		if (step.type !== 'group') {
			continue;
		}
		entries.push(buildGroupEntry(step, mode, context));
	}
	return entries;
}
