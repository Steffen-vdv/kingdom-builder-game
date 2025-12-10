import type {
	ActionChoiceMap,
	ActionEffectChoice,
	ActionParametersPayload,
} from '../actions/contracts';
import type {
	ActionEffect,
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '../config/schema';
import type { EffectDef } from '../effects';

export type ActionEffectGroupChoice = ActionEffectChoice;
export type ActionEffectGroupChoiceMap = ActionChoiceMap;

export function applyParamsToEffects<E extends EffectDef>(
	effects: E[],
	params: Record<string, unknown>,
): E[] {
	const replace = (val: unknown): unknown => {
		if (typeof val !== 'string') {
			return val;
		}
		// If exact placeholder (e.g., "$player"), return the param value directly
		// This preserves non-string types like numbers
		if (val.startsWith('$') && /^\$\w+$/.test(val)) {
			const key = val.slice(1);
			return key in params ? params[key] : val;
		}
		// If string contains embedded placeholders (e.g., "legion_$player_$index"),
		// interpolate them as strings
		if (val.includes('$')) {
			return val.replace(/\$(\w+)/g, (match, key) => {
				return key in params ? String(params[key]) : match;
			});
		}
		return val;
	};
	const replaceDeep = (val: unknown): unknown => {
		if (Array.isArray(val)) {
			return val.map(replaceDeep);
		}
		if (val && typeof val === 'object') {
			return Object.fromEntries(
				Object.entries(val).map(([key, value]) => [key, replaceDeep(value)]),
			);
		}
		return replace(val);
	};
	const mapEffect = (effect: E): E => ({
		...effect,
		params: effect.params
			? (Object.fromEntries(
					Object.entries(effect.params).map(([key, value]) => [
						key,
						replaceDeep(value),
					]),
				) as E['params'])
			: undefined,
		evaluator: effect.evaluator
			? {
					...effect.evaluator,
					params: effect.evaluator.params
						? Object.fromEntries(
								Object.entries(effect.evaluator.params).map(([key, value]) => [
									key,
									replaceDeep(value),
								]),
							)
						: undefined,
				}
			: undefined,
		effects: effect.effects
			? applyParamsToEffects(effect.effects, params)
			: undefined,
		meta: effect.meta
			? (replaceDeep(effect.meta) as Record<string, unknown>)
			: undefined,
	});
	return effects.map(mapEffect);
}

function isActionEffectGroup(
	effect: ActionEffect,
): effect is ActionEffectGroup {
	return Boolean(effect && typeof effect === 'object' && 'options' in effect);
}

function extractActionParams(
	params?: ActionParametersPayload,
): Record<string, unknown> {
	if (!params || typeof params !== 'object') {
		return {};
	}
	const entries = Object.entries(params as Record<string, unknown>);
	const baseEntries = entries.filter(([key]) => key !== 'choices');
	return Object.fromEntries(baseEntries);
}

function mergeOptionParams(
	option: ActionEffectGroupOption,
	baseParams: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...baseParams };
	const optionParams = option.params || {};
	for (const [key, value] of Object.entries(optionParams)) {
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

function buildOptionEffects(
	option: ActionEffectGroupOption,
	optionParams: Record<string, unknown>,
): EffectDef[] {
	const effect: EffectDef = {
		type: 'action',
		method: 'perform',
		params: {
			...optionParams,
			actionId: option.actionId,
			__actionId: option.actionId,
		},
	};
	return applyParamsToEffects([effect], optionParams);
}

export interface ResolvedActionEffectGroupOption {
	option: ActionEffectGroupOption;
	effects: EffectDef[];
	params: Record<string, unknown>;
}

export interface ResolvedActionEffectGroup {
	group: ActionEffectGroup;
	selection?: ResolvedActionEffectGroupOption;
}

export interface ResolvedActionEffectGroupStep {
	type: 'group';
	group: ActionEffectGroup;
	selection?: ResolvedActionEffectGroupOption;
	params: Record<string, unknown>;
}

export type ResolvedActionEffectStep =
	| { type: 'effects'; effects: EffectDef[] }
	| ResolvedActionEffectGroupStep;

export interface ResolvedActionEffects {
	effects: EffectDef[];
	groups: ResolvedActionEffectGroup[];
	choices: ActionEffectGroupChoiceMap;
	missingSelections: string[];
	params: Record<string, unknown>;
	steps: ResolvedActionEffectStep[];
}

export function coerceActionEffectGroupChoices(
	value: unknown,
): ActionEffectGroupChoiceMap {
	if (!value || typeof value !== 'object') {
		return {};
	}
	const entries: [string, ActionEffectGroupChoice][] = [];
	for (const [key, raw] of Object.entries(value)) {
		if (!raw || typeof raw !== 'object') {
			continue;
		}
		const optionId = (raw as Record<string, unknown>)['optionId'];
		if (typeof optionId !== 'string') {
			continue;
		}
		const rawParams = (raw as Record<string, unknown>)['params'];
		let normalizedParams: Record<string, unknown> | undefined;
		if (rawParams && typeof rawParams === 'object') {
			normalizedParams = rawParams as Record<string, unknown>;
		}
		const choice: ActionEffectGroupChoice = { optionId };
		if (normalizedParams) {
			choice.params = normalizedParams;
		}
		entries.push([key, choice]);
	}
	return Object.fromEntries(entries);
}

export function resolveActionEffects(
	actionDefinition: { id: string; effects: ActionEffect[] },
	params?: ActionParametersPayload,
): ResolvedActionEffects {
	const substitutionParams = extractActionParams(params);
	const choices = coerceActionEffectGroupChoices(params?.choices);
	const resolvedEffects: EffectDef[] = [];
	const resolvedGroups: ResolvedActionEffectGroup[] = [];
	const missingSelections: string[] = [];
	const steps: ResolvedActionEffectStep[] = [];

	for (const effect of actionDefinition.effects) {
		if (!isActionEffectGroup(effect)) {
			const applied = applyParamsToEffects([effect], substitutionParams);
			resolvedEffects.push(...applied);
			if (applied.length > 0) {
				steps.push({ type: 'effects', effects: applied });
			}
			continue;
		}

		const group: ResolvedActionEffectGroup = { group: effect };
		const selection = choices[effect.id];
		if (!selection) {
			missingSelections.push(effect.id);
			resolvedGroups.push(group);
			steps.push({
				type: 'group',
				group: effect,
				params: { ...substitutionParams },
			});
			continue;
		}
		const option = effect.options.find(
			(candidate) => candidate.id === selection.optionId,
		);
		if (!option) {
			const optionId = selection.optionId;
			const effectId = effect.id;
			const actionId = actionDefinition.id;
			throw new Error(
				`Unknown option "${optionId}" for effect group "${effectId}" ` +
					`on action ${actionId}`,
			);
		}
		const mergedParams = {
			...substitutionParams,
			...(selection.params || {}),
		};
		const optionParams = mergeOptionParams(option, mergedParams);
		const optionEffects = buildOptionEffects(option, optionParams);
		const resolvedOption: ResolvedActionEffectGroupOption = {
			option,
			effects: optionEffects,
			params: optionParams,
		};
		group.selection = resolvedOption;
		resolvedGroups.push(group);
		resolvedEffects.push(...optionEffects);
		steps.push({
			type: 'group',
			group: effect,
			selection: resolvedOption,
			params: { ...substitutionParams },
		});
	}

	return {
		effects: resolvedEffects,
		groups: resolvedGroups,
		choices,
		missingSelections,
		params: { ...substitutionParams },
		steps,
	};
}
