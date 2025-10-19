import { vi } from 'vitest';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import type { SessionActionMetadataSnapshot } from '../../src/state/sessionTypes';
import { createMetadataKey } from '../../src/state/actionMetadataKey';

type MetadataListener = (snapshot: SessionActionMetadataSnapshot) => void;

const metadataStore = new Map<string, SessionActionMetadataSnapshot>();
const metadataListeners = new Map<string, Set<MetadataListener>>();

const cloneValue = <T>(value: T): T => {
	if (value === undefined) {
		return value;
	}
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

const cloneSnapshot = (
	snapshot: SessionActionMetadataSnapshot,
): SessionActionMetadataSnapshot => ({
	costs: snapshot.costs ? cloneValue(snapshot.costs) : undefined,
	requirements: snapshot.requirements
		? cloneValue(snapshot.requirements)
		: undefined,
	groups: snapshot.groups ? cloneValue(snapshot.groups) : undefined,
});

const toKey = (
	sessionId: string,
	actionId: string,
	params: ActionParametersPayload | undefined,
) => `${sessionId}:${createMetadataKey(actionId, params)}`;

const emitSnapshot = (key: string, snapshot: SessionActionMetadataSnapshot) => {
	const listeners = metadataListeners.get(key);
	if (!listeners) {
		return;
	}
	for (const listener of listeners) {
		listener(cloneSnapshot(snapshot));
	}
};

const upsertSnapshot = (
	key: string,
	updater: (snapshot: SessionActionMetadataSnapshot) => void,
) => {
	const current = metadataStore.get(key);
	const next = current ? cloneSnapshot(current) : {};
	updater(next);
	metadataStore.set(key, next);
	emitSnapshot(key, next);
};

const readSessionActionMetadataMock = vi.fn(
	(sessionId: string, actionId: string, params?: ActionParametersPayload) => {
		const key = toKey(sessionId, actionId, params);
		const snapshot = metadataStore.get(key);
		if (!snapshot) {
			return {};
		}
		return cloneSnapshot(snapshot);
	},
);

const subscribeSessionActionMetadataMock = vi.fn(
	(
		sessionId: string,
		actionId: string,
		params: ActionParametersPayload | undefined,
		listener: MetadataListener,
	) => {
		const key = toKey(sessionId, actionId, params);
		let listeners = metadataListeners.get(key);
		if (!listeners) {
			listeners = new Set();
			metadataListeners.set(key, listeners);
		}
		listeners.add(listener);
		return () => {
			const entry = metadataListeners.get(key);
			if (!entry) {
				return;
			}
			entry.delete(listener);
			if (entry.size === 0) {
				metadataListeners.delete(key);
			}
		};
	},
);

const setSessionActionCostsMock = vi.fn(
	(
		sessionId: string,
		actionId: string,
		costs: SessionActionCostMap,
		params?: ActionParametersPayload,
	) => {
		const key = toKey(sessionId, actionId, params);
		upsertSnapshot(key, (snapshot) => {
			snapshot.costs = cloneValue(costs);
		});
	},
);

const setSessionActionRequirementsMock = vi.fn(
	(
		sessionId: string,
		actionId: string,
		requirements: SessionActionRequirementList,
		params?: ActionParametersPayload,
	) => {
		const key = toKey(sessionId, actionId, params);
		upsertSnapshot(key, (snapshot) => {
			snapshot.requirements = cloneValue(requirements);
		});
	},
);

const setSessionActionOptionsMock = vi.fn(
	(sessionId: string, actionId: string, groups: ActionEffectGroup[]) => {
		const prefix = `${sessionId}:${actionId}:`;
		let handled = false;
		for (const key of metadataStore.keys()) {
			if (!key.startsWith(prefix)) {
				continue;
			}
			handled = true;
			upsertSnapshot(key, (snapshot) => {
				snapshot.groups = cloneValue(groups);
			});
		}
		if (handled) {
			return;
		}
		const key = toKey(sessionId, actionId, undefined);
		upsertSnapshot(key, (snapshot) => {
			snapshot.groups = cloneValue(groups);
		});
	},
);

export function clearSessionActionMetadataStore(): void {
	metadataStore.clear();
	metadataListeners.clear();
	readSessionActionMetadataMock.mockClear();
	subscribeSessionActionMetadataMock.mockClear();
	setSessionActionCostsMock.mockClear();
	setSessionActionRequirementsMock.mockClear();
	setSessionActionOptionsMock.mockClear();
}

export function seedSessionActionMetadata(
	sessionId: string,
	actionId: string,
	snapshot: SessionActionMetadataSnapshot,
	params?: ActionParametersPayload,
): void {
	if (snapshot.costs) {
		setSessionActionCostsMock(sessionId, actionId, snapshot.costs, params);
	}
	if (snapshot.requirements) {
		setSessionActionRequirementsMock(
			sessionId,
			actionId,
			snapshot.requirements,
			params,
		);
	}
	if (snapshot.groups) {
		setSessionActionOptionsMock(sessionId, actionId, snapshot.groups);
	}
}

vi.mock('../../src/state/sessionActionMetadataStore', () => ({
	readSessionActionMetadata: (
		sessionId: string,
		actionId: string,
		params?: ActionParametersPayload,
	) => readSessionActionMetadataMock(sessionId, actionId, params),
	subscribeSessionActionMetadata: (
		sessionId: string,
		actionId: string,
		params: ActionParametersPayload | undefined,
		listener: MetadataListener,
	) =>
		subscribeSessionActionMetadataMock(sessionId, actionId, params, listener),
	setSessionActionCosts: (
		sessionId: string,
		actionId: string,
		costs: SessionActionCostMap,
		params?: ActionParametersPayload,
	) => setSessionActionCostsMock(sessionId, actionId, costs, params),
	setSessionActionRequirements: (
		sessionId: string,
		actionId: string,
		requirements: SessionActionRequirementList,
		params?: ActionParametersPayload,
	) =>
		setSessionActionRequirementsMock(sessionId, actionId, requirements, params),
	setSessionActionOptions: (
		sessionId: string,
		actionId: string,
		groups: ActionEffectGroup[],
	) => setSessionActionOptionsMock(sessionId, actionId, groups),
}));

export {
	readSessionActionMetadataMock,
	subscribeSessionActionMetadataMock,
	setSessionActionCostsMock,
	setSessionActionRequirementsMock,
	setSessionActionOptionsMock,
};
