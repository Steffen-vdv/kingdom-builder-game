import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';

export type ActionCostListener = (value: SessionActionCostMap) => void;
export type ActionRequirementListener = (
	value: SessionActionRequirementList,
) => void;
export type ActionOptionListener = (value: ActionEffectGroup[]) => void;

export const cloneValue = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

const sortKeys = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map((entry) => sortKeys(entry));
	}
	if (value && typeof value === 'object') {
		const sorted = Object.keys(value as Record<string, unknown>)
			.sort()
			.map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]);
		return Object.fromEntries(sorted);
	}
	return value;
};

export const serializeActionParams = (params: unknown): string => {
	if (params === undefined) {
		return '';
	}
	try {
		return JSON.stringify(sortKeys(params));
	} catch {
		return '';
	}
};

export function emitNestedListeners<ValueType>(
	listeners: Map<string, Map<string, Set<(value: ValueType) => void>>>,
	actionId: string,
	paramsKey: string,
	value: ValueType,
	transform: (input: ValueType) => ValueType,
): void {
	const actionListeners = listeners.get(actionId);
	const paramListeners = actionListeners?.get(paramsKey);
	if (!paramListeners || paramListeners.size === 0) {
		return;
	}
	for (const listener of Array.from(paramListeners)) {
		listener(transform(value));
	}
}

export function emitListeners<ValueType>(
	listeners: Map<string, Set<(value: ValueType) => void>>,
	actionId: string,
	value: ValueType,
	transform: (input: ValueType) => ValueType,
): void {
	const actionListeners = listeners.get(actionId);
	if (!actionListeners || actionListeners.size === 0) {
		return;
	}
	for (const listener of Array.from(actionListeners)) {
		listener(transform(value));
	}
}

export function addNestedListener<ValueType>(
	listeners: Map<string, Map<string, Set<(value: ValueType) => void>>>,
	actionId: string,
	paramsKey: string,
	listener: (value: ValueType) => void,
): () => void {
	let actionListeners = listeners.get(actionId);
	if (!actionListeners) {
		actionListeners = new Map();
		listeners.set(actionId, actionListeners);
	}
	let paramListeners = actionListeners.get(paramsKey);
	if (!paramListeners) {
		paramListeners = new Set();
		actionListeners.set(paramsKey, paramListeners);
	}
	paramListeners.add(listener);
	return () => {
		paramListeners?.delete(listener);
		if (paramListeners && paramListeners.size === 0) {
			actionListeners?.delete(paramsKey);
		}
		if (actionListeners && actionListeners.size === 0) {
			listeners.delete(actionId);
		}
	};
}

export function addListener<ValueType>(
	listeners: Map<string, Set<(value: ValueType) => void>>,
	actionId: string,
	listener: (value: ValueType) => void,
): () => void {
	let actionListeners = listeners.get(actionId);
	if (!actionListeners) {
		actionListeners = new Set();
		listeners.set(actionId, actionListeners);
	}
	actionListeners.add(listener);
	return () => {
		actionListeners?.delete(listener);
		if (actionListeners && actionListeners.size === 0) {
			listeners.delete(actionId);
		}
	};
}
