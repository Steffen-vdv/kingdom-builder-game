import { applyParamsToEffects } from '../utils';
import type { EffectDef } from '../effects';
import type {
	ActionEffect,
	ActionEffectGroup,
	ActionEffectGroupOption,
	EffectConfig,
} from '../config/schema';
import type { ActionParameters } from './action_parameters';
import type { EngineContext } from '../context';
interface NormalizedChoiceSelection {
	option: string;
	params: Record<string, unknown>;
}
interface NormalizedActionParameters {
	values: Record<string, unknown>;
	choices: Record<string, NormalizedChoiceSelection>;
}
export interface ResolvedActionEffectGroupOption {
	id: string;
	label?: string | undefined;
	meta?: Record<string, unknown> | undefined;
	groups: ResolvedActionEffectGroup[];
}
export interface ResolvedActionEffectGroup {
	id: string;
	label?: string | undefined;
	required: boolean;
	meta?: Record<string, unknown> | undefined;
	options: ResolvedActionEffectGroupOption[];
}
export interface ResolvedActionEffectChoice {
	groupId: string;
	optionId: string;
	group: ResolvedActionEffectGroup;
	option: ResolvedActionEffectGroupOption;
	params: Record<string, unknown>;
}
export interface ResolvedActionEffects {
	effects: EffectDef[];
	groups: ResolvedActionEffectGroup[];
	choices: ResolvedActionEffectChoice[];
}
const isActionEffectGroup = (
	effect: ActionEffect,
): effect is ActionEffectGroup =>
	typeof (effect as ActionEffectGroup).group === 'string';

function replaceValue(
	value: unknown,
	params: Record<string, unknown>,
): unknown {
	if (typeof value === 'string' && value.startsWith('$')) {
		return params[value.slice(1)];
	}
	if (Array.isArray(value)) {
		return value.map((entry) => replaceValue(entry, params));
	}
	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		return Object.fromEntries(
			entries.map(([key, entry]) => [key, replaceValue(entry, params)]),
		);
	}
	return value;
}
function resolveGroupOptionDefinition(
	option: ActionEffectGroupOption,
	params: Record<string, unknown>,
): ResolvedActionEffectGroupOption {
	return {
		id: option.id,
		label: option.label
			? (replaceValue(option.label, params) as string)
			: undefined,
		meta: option.meta
			? (replaceValue(option.meta, params) as Record<string, unknown>)
			: undefined,
		groups: collectActionEffectGroups(option.effects, params),
	};
}
function resolveGroupDefinition(
	group: ActionEffectGroup,
	params: Record<string, unknown>,
): ResolvedActionEffectGroup {
	return {
		id: group.group,
		label: group.label
			? (replaceValue(group.label, params) as string)
			: undefined,
		required: group.required !== false,
		meta: group.meta
			? (replaceValue(group.meta, params) as Record<string, unknown>)
			: undefined,
		options: group.options.map((option) =>
			resolveGroupOptionDefinition(option, params),
		),
	};
}
function collectActionEffectGroups(
	effects: ActionEffect[],
	params: Record<string, unknown>,
): ResolvedActionEffectGroup[] {
	return effects
		.filter(isActionEffectGroup)
		.map((group) => resolveGroupDefinition(group, params));
}
function normalizeActionParameters<T extends string>(
	params?: ActionParameters<T>,
): NormalizedActionParameters {
	if (!params) {
		return { values: {}, choices: {} };
	}
	const base: Record<string, unknown> = {},
		choices: Record<string, NormalizedChoiceSelection> = {};
	const entries = params as Record<string, unknown>;
	for (const [key, value] of Object.entries(entries)) {
		if (key === 'choices') {
			continue;
		}
		if (key === 'values' && value && typeof value === 'object') {
			Object.assign(base, value as Record<string, unknown>);
			continue;
		}
		base[key] = value;
	}
	const rawChoices = (entries['choices'] ?? {}) as Record<string, unknown>;
	for (const [groupId, choiceValue] of Object.entries(rawChoices)) {
		if (choiceValue == null) {
			continue;
		}
		if (typeof choiceValue === 'string') {
			choices[groupId] = { option: choiceValue, params: {} };
			continue;
		}
		if (
			typeof choiceValue === 'object' &&
			choiceValue !== null &&
			'option' in (choiceValue as Record<string, unknown>) &&
			typeof (choiceValue as { option: unknown }).option === 'string'
		) {
			const detail = choiceValue as {
				option: string;
				params?: Record<string, unknown>;
			};
			choices[groupId] = {
				option: detail.option,
				params: detail.params ? { ...detail.params } : {},
			};
			continue;
		}
		throw new Error(`Invalid choice payload for group ${groupId}`);
	}
	return { values: base, choices };
}
interface ResolveState {
	effects: EffectDef[];
	groups: ResolvedActionEffectGroup[];
	choices: ResolvedActionEffectChoice[];
	usedChoiceIds: Set<string>;
}
function resolveEffectsRecursive(
	effects: ActionEffect[],
	params: Record<string, unknown>,
	choices: NormalizedActionParameters['choices'],
	state: ResolveState,
): void {
	for (const effect of effects) {
		if (!isActionEffectGroup(effect)) {
			const effectConfig: EffectConfig = effect;
			const effectList: EffectConfig[] = [effectConfig];
			const [applied] = applyParamsToEffects(effectList, params);
			if (!applied) {
				continue;
			}
			state.effects.push(applied);
			continue;
		}
		const resolvedGroup = resolveGroupDefinition(effect, params);
		state.groups.push(resolvedGroup);
		const selection = choices[resolvedGroup.id];
		if (!selection) {
			if (resolvedGroup.required) {
				const detail = resolvedGroup.label ?? resolvedGroup.id;
				throw new Error(`Missing choice for action effect group "${detail}"`);
			}
			continue;
		}
		state.usedChoiceIds.add(resolvedGroup.id);
		const optionDef = effect.options.find(
			(option) => option.id === selection.option,
		);
		if (!optionDef) {
			throw new Error(
				`Invalid option "${selection.option}"` +
					` for effect group "${resolvedGroup.id}"`,
			);
		}
		const optionParams = { ...params, ...selection.params };
		const resolvedOption = resolveGroupOptionDefinition(
			optionDef,
			optionParams,
		);
		const optionEffects = optionDef.effects;
		state.choices.push({
			groupId: resolvedGroup.id,
			optionId: resolvedOption.id,
			group: resolvedGroup,
			option: resolvedOption,
			params: selection.params,
		});
		resolveEffectsRecursive(optionEffects, optionParams, choices, state);
	}
}
export function resolveActionEffects<T extends string>(
	effects: ActionEffect[],
	params?: ActionParameters<T>,
): ResolvedActionEffects {
	const normalized = normalizeActionParameters(params),
		state: ResolveState = {
			effects: [],
			groups: [],
			choices: [],
			usedChoiceIds: new Set<string>(),
		};
	resolveEffectsRecursive(
		effects,
		normalized.values,
		normalized.choices,
		state,
	);
	for (const groupId of Object.keys(normalized.choices)) {
		if (!state.usedChoiceIds.has(groupId)) {
			throw new Error(`Unknown effect group choice "${groupId}"`);
		}
	}
	return {
		effects: state.effects,
		groups: state.groups,
		choices: state.choices,
	};
}
export function getActionEffectGroups<T extends string>(
	actionId: T,
	ctx: EngineContext,
	params?: ActionParameters<T>,
): ResolvedActionEffectGroup[] {
	const def = ctx.actions.get(actionId);
	const normalized = normalizeActionParameters(params);
	return collectActionEffectGroups(def.effects, normalized.values);
}
