import type {
	ActionConfig,
	ActionEffect,
	ActionEffectGroup,
	EffectDef,
} from '@kingdom-builder/protocol';
import { logContent } from './factory';
import type { TranslationContext } from '../context';

export type ActionLogHook = (
	context: TranslationContext,
	params?: Record<string, unknown>,
) => string;

const manualHooks = new Map<string, ActionLogHook>();
const derivedCache = new Map<string, ActionLogHook | null>();
const resolvers: ActionLogHookResolver[] = [];

type ActionLogHookResolver = (
	actionDefinition: ActionConfig,
) => ActionLogHook | undefined;

export function registerActionLogHook(id: string, hook: ActionLogHook): void {
	manualHooks.set(id, hook);
	derivedCache.set(id, hook);
}

export function registerActionLogHookResolver(
	resolver: ActionLogHookResolver,
): void {
	resolvers.push(resolver);
	derivedCache.clear();
}

function isEffectGroup(effect: ActionEffect): effect is ActionEffectGroup {
	return Boolean(effect && typeof effect === 'object' && 'options' in effect);
}

function findEffect(
	effects: ActionEffect[] | undefined,
	predicate: (effect: EffectDef) => boolean,
): EffectDef | undefined {
	if (!effects) {
		return undefined;
	}
	for (const effect of effects) {
		if (!effect || typeof effect !== 'object') {
			continue;
		}
		if (isEffectGroup(effect)) {
			continue;
		}
		if (predicate(effect)) {
			return effect;
		}
		const nested = findEffect(effect.effects, predicate);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

function extractString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function extractTemplateParam(
	params: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const raw = extractString(params?.[key]);
	if (!raw) {
		return undefined;
	}
	return raw.startsWith('$') ? raw.slice(1) : undefined;
}

function extractStaticParam(
	params: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const raw = extractString(params?.[key]);
	if (!raw) {
		return undefined;
	}
	return raw.startsWith('$') ? undefined : raw;
}

interface LinkedContentResolverOptions {
	effectType: string;
	method: string;
	contentType: string;
	paramKey?: string;
	/**
	 * When true, skip appending if the target label already appears in the
	 * action name (prevents duplication when the action name IS the target).
	 */
	skipIfNameMatches?: boolean;
}

function createLinkedContentResolver({
	effectType,
	method,
	contentType,
	paramKey = 'id',
	skipIfNameMatches = false,
}: LinkedContentResolverOptions): ActionLogHookResolver {
	return (actionDefinition) => {
		const matchesTarget = (candidate: EffectDef): boolean => {
			const matchesType = candidate.type === effectType;
			const matchesMethod = candidate.method === method;
			return matchesType && matchesMethod;
		};
		const effect = findEffect(actionDefinition.effects, matchesTarget);
		if (!effect) {
			return undefined;
		}
		const effectParams = effect.params;
		const templateParam = extractTemplateParam(effectParams, paramKey);
		const staticValue = extractStaticParam(effectParams, paramKey);
		return (context, params) => {
			let targetId: string | undefined;
			if (templateParam) {
				targetId = extractString(params?.[templateParam]);
			}
			if (!targetId) {
				targetId = extractString(params?.[paramKey]);
			}
			if (!targetId) {
				targetId = staticValue;
			}
			if (!targetId) {
				return '';
			}
			const [rawTarget] = logContent(contentType, targetId, context);
			const target =
				rawTarget && typeof rawTarget === 'object' ? rawTarget.text : rawTarget;
			if (!target) {
				return '';
			}
			// Skip appending if the action name already contains the target label
			// (prevents duplication when the action's name IS the target name)
			if (skipIfNameMatches) {
				const actionName = actionDefinition.name?.trim();
				if (actionName && target.includes(actionName)) {
					return '';
				}
			}
			return ` - ${target}`;
		};
	};
}

export function getActionLogHook(
	actionDefinition: ActionConfig,
): ActionLogHook | undefined {
	const manual = manualHooks.get(actionDefinition.id);
	if (manual) {
		return manual;
	}
	if (derivedCache.has(actionDefinition.id)) {
		return derivedCache.get(actionDefinition.id) ?? undefined;
	}
	for (const resolver of resolvers) {
		const hook = resolver(actionDefinition);
		if (hook) {
			derivedCache.set(actionDefinition.id, hook);
			return hook;
		}
	}
	derivedCache.set(actionDefinition.id, null);
	return undefined;
}

registerActionLogHookResolver(
	createLinkedContentResolver({
		effectType: 'building',
		method: 'add',
		contentType: 'building',
		skipIfNameMatches: true,
	}),
);

registerActionLogHookResolver(
	createLinkedContentResolver({
		effectType: 'development',
		method: 'add',
		contentType: 'development',
	}),
);

registerActionLogHookResolver(
	createLinkedContentResolver({
		effectType: 'population',
		method: 'add',
		contentType: 'population',
		paramKey: 'role',
	}),
);
