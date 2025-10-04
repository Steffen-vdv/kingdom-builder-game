import { applyParamsToEffects } from '../utils';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type {
	ActionEffect,
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '../config/schema';
import type { ActionParameters } from './action_parameters';

export interface ActionEffectGroupChoice {
	optionId: string;
	params?: Record<string, unknown>;
}

export type ActionEffectGroupChoiceMap = Record<
	string,
	ActionEffectGroupChoice
>;

function isActionEffectGroup(
	effect: ActionEffect,
): effect is ActionEffectGroup {
	return Boolean(effect && typeof effect === 'object' && 'options' in effect);
}

function extractActionParams(
	params?: ActionParameters<string>,
): Record<string, unknown> {
	if (!params || typeof params !== 'object') {
		return {};
	}
	const entries = Object.entries(params as Record<string, unknown>);
	const baseEntries = entries.filter(([key]) => key !== 'choices');
	return Object.fromEntries(baseEntries);
}

function buildOptionEffects(
	option: ActionEffectGroupOption,
	substitutionParams: Record<string, unknown>,
): EffectDef[] {
	const effect: EffectDef = {
		type: 'action',
		method: 'perform',
		params: {
			...(option.params || {}),
			__actionId: option.actionId,
		},
	};
	return applyParamsToEffects([effect], substitutionParams);
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

export interface ResolvedActionEffects {
	effects: EffectDef[];
	groups: ResolvedActionEffectGroup[];
	choices: ActionEffectGroupChoiceMap;
	missingSelections: string[];
}

export type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '../config/schema';

export function getActionEffectGroups(
	actionId: string,
	ctx: EngineContext,
): ActionEffectGroup[] {
	const definition = ctx.actions.get(actionId);
	const groups: ActionEffectGroup[] = [];
	for (const effect of definition.effects) {
		if (isActionEffectGroup(effect)) {
			groups.push(effect);
		}
	}
	return groups;
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

export function resolveActionEffects<T extends string>(
	actionDefinition: { id: string; effects: ActionEffect[] },
	params?: ActionParameters<T>,
): ResolvedActionEffects {
	const substitutionParams = extractActionParams(params);
	const choices = coerceActionEffectGroupChoices(params?.choices);
	const resolvedEffects: EffectDef[] = [];
	const resolvedGroups: ResolvedActionEffectGroup[] = [];
	const missingSelections: string[] = [];

	for (const effect of actionDefinition.effects) {
		if (!isActionEffectGroup(effect)) {
			const applied = applyParamsToEffects([effect], substitutionParams);
			resolvedEffects.push(...applied);
			continue;
		}

		const group: ResolvedActionEffectGroup = { group: effect };
		const selection = choices[effect.id];
		if (!selection) {
			missingSelections.push(effect.id);
			resolvedGroups.push(group);
			continue;
		}
		const option = effect.options.find(
			(candidate) => candidate.id === selection.optionId,
		);
		if (!option) {
			throw new Error(
				`Unknown option "${selection.optionId}" for effect group "${effect.id}" on action ${actionDefinition.id}`,
			);
		}
		const mergedParams = {
			...substitutionParams,
			...(selection.params || {}),
		};
		const optionEffects = buildOptionEffects(option, mergedParams);
		const resolvedOption: ResolvedActionEffectGroupOption = {
			option,
			effects: optionEffects,
			params: mergedParams,
		};
		group.selection = resolvedOption;
		resolvedGroups.push(group);
		resolvedEffects.push(...optionEffects);
	}

	return {
		effects: resolvedEffects,
		groups: resolvedGroups,
		choices,
		missingSelections,
	};
}
