import type {
	EngineContext,
	EffectDef,
	ActionEffect,
	ActionEffectGroup,
} from '@kingdom-builder/engine';
import type { ActionConfig } from '@kingdom-builder/protocol';
import { logContent } from './factory';

export type ActionLogHook = (
	ctx: EngineContext,
	params?: Record<string, unknown>,
) => string;

const manualHooks = new Map<string, ActionLogHook>();
const derivedCache = new Map<string, ActionLogHook | null>();
const resolvers: ActionLogHookResolver[] = [];

type ActionLogHookResolver = (def: ActionConfig) => ActionLogHook | undefined;

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

function createLinkedContentResolver({
	effectType,
	method,
	contentType,
	paramKey = 'id',
}: {
	effectType: string;
	method: string;
	contentType: string;
	paramKey?: string;
}): ActionLogHookResolver {
	return (def) => {
		const effect = findEffect(def.effects, (candidate) => {
			return candidate.type === effectType && candidate.method === method;
		});
		if (!effect) {
			return undefined;
		}
		const templateParam = extractTemplateParam(effect.params, paramKey);
		const staticValue = extractStaticParam(effect.params, paramKey);
		return (ctx, params) => {
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
			const target = logContent(contentType, targetId, ctx)[0];
			return target ? ` - ${target}` : '';
		};
	};
}

export function getActionLogHook(def: ActionConfig): ActionLogHook | undefined {
	const manual = manualHooks.get(def.id);
	if (manual) {
		return manual;
	}
	if (derivedCache.has(def.id)) {
		return derivedCache.get(def.id) ?? undefined;
	}
	for (const resolver of resolvers) {
		const hook = resolver(def);
		if (hook) {
			derivedCache.set(def.id, hook);
			return hook;
		}
	}
	derivedCache.set(def.id, null);
	return undefined;
}

registerActionLogHookResolver(
	createLinkedContentResolver({
		effectType: 'building',
		method: 'add',
		contentType: 'building',
	}),
);

registerActionLogHookResolver(
	createLinkedContentResolver({
		effectType: 'development',
		method: 'add',
		contentType: 'development',
	}),
);
