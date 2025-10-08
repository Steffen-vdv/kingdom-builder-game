import { type EffectDef } from '@kingdom-builder/engine';
import { type StepEffects } from './statBreakdown';
import { appendMetaSourceIcons } from './resourceSources/meta';
import { appendEvaluatorModifiers } from './resourceSources/modifiers';
import { type ResourceSourceEntry } from './resourceSources/types';
import {
	EVALUATOR_ICON_RENDERERS,
	type EvaluatorIconRenderer,
} from './resourceSources/evaluators';
import { type TranslationDiffContext } from './resourceSources/context';

function ensureEntry(
	map: Record<string, ResourceSourceEntry>,
	key: string,
): ResourceSourceEntry {
	if (!map[key]) {
		map[key] = { icons: '', mods: '' };
	}
	return map[key];
}

function findNestedResource(effect: EffectDef): EffectDef | undefined {
	for (const candidate of effect.effects ?? []) {
		if (candidate.type === 'resource') {
			return candidate;
		}
	}
	return undefined;
}

function readResourceKey(effect: EffectDef): string | undefined {
	const params = effect.params;
	const key = params?.['key'];
	return typeof key === 'string' ? key : undefined;
}

function appendEvaluatorIcons(
	entry: ResourceSourceEntry,
	evaluator: { type: string; params?: Record<string, unknown> },
	context: TranslationDiffContext,
	ownerSuffix: string,
) {
	try {
		EVALUATOR_ICON_RENDERERS[evaluator.type]?.(evaluator, entry, context);
		appendEvaluatorModifiers(entry, evaluator, context, ownerSuffix);
	} catch {
		// ignore missing evaluators
	}
}

function handleEvaluatorEffect(
	effect: EffectDef,
	map: Record<string, ResourceSourceEntry>,
	context: TranslationDiffContext,
	ownerSuffix: string,
) {
	const nestedResource = findNestedResource(effect);
	if (!nestedResource) {
		return;
	}
	const key = readResourceKey(nestedResource);
	if (!key) {
		return;
	}
	const entry = ensureEntry(map, key);
	const evaluator = effect.evaluator as {
		type: string;
		params?: Record<string, unknown>;
	};
	appendEvaluatorIcons(entry, evaluator, context, ownerSuffix);
}

function handleDirectResourceEffect(
	effect: EffectDef,
	map: Record<string, ResourceSourceEntry>,
	context: TranslationDiffContext,
) {
	const key = readResourceKey(effect);
	if (!key) {
		return;
	}
	const entry = ensureEntry(map, key);
	const meta = effect.meta?.['source'];
	appendMetaSourceIcons(entry, meta, context);
}

function buildResourceSummary(
	map: Record<string, ResourceSourceEntry>,
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, { icons, mods }] of Object.entries(map)) {
		let part = icons;
		if (mods) {
			part += `+${mods}`;
		}
		result[key] = part;
	}
	return result;
}

export function collectResourceSources(
	step: StepEffects,
	context: TranslationDiffContext,
): Record<string, string> {
	const map: Record<string, ResourceSourceEntry> = {};
	const ownerSuffix = `_${context.activePlayer.id}`;
	for (const effect of step?.effects ?? []) {
		if (!effect || typeof effect !== 'object') {
			continue;
		}
		if ('evaluator' in effect && Array.isArray(effect.effects)) {
			handleEvaluatorEffect(effect, map, context, ownerSuffix);
		}
		if (effect.type === 'resource') {
			handleDirectResourceEffect(effect, map, context);
		}
	}
	return buildResourceSummary(map);
}

export type { EvaluatorIconRenderer };
export { EVALUATOR_ICON_RENDERERS };
