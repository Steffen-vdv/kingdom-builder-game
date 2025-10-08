import { applyParamsToEffects } from '../utils';
import type { EngineContext } from '../context';
import type {
	EffectDef,
	ActionEffect,
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
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

export type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';

export function getActionEffectGroups(
	actionId: string,
	ctx: EngineContext,
): ActionEffectGroup[] {
	let definition: { effects: ActionEffect[] } | undefined;
	try {
		definition = ctx.actions.get(actionId);
	} catch (error) {
		throw new Error(`Unknown action "${actionId}"`, { cause: error });
	}
	if (!definition) {
		throw new Error(`Unknown action "${actionId}"`);
	}
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
