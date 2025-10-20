/** @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import type { SessionActionMetadataSnapshot } from '../../src/state/sessionTypes';
import { useActionMetadata } from '../../src/state/useActionMetadata';

interface MetadataListener {
	(snapshot: SessionActionMetadataSnapshot): void;
}

const metadataStoreMock = (() => {
	let snapshot: SessionActionMetadataSnapshot = {};
	const listeners = new Set<MetadataListener>();
	const emit = () => {
		for (const listener of listeners) {
			listener(snapshot);
		}
	};
	return {
		reset() {
			snapshot = {};
			listeners.clear();
		},
		read(): SessionActionMetadataSnapshot {
			return snapshot;
		},
		subscribe(listener: MetadataListener) {
			listeners.add(listener);
			listener(snapshot);
			return () => {
				listeners.delete(listener);
			};
		},
		setCosts(costs: SessionActionCostMap) {
			snapshot = {
				...snapshot,
				costs,
				stale: { ...snapshot.stale, costs: false },
			};
			emit();
		},
		setRequirements(requirements: SessionActionRequirementList) {
			snapshot = {
				...snapshot,
				requirements,
				stale: { ...snapshot.stale, requirements: false },
			};
			emit();
		},
		setGroups(groups: ActionEffectGroup[]) {
			snapshot = {
				...snapshot,
				groups,
				stale: { ...snapshot.stale, groups: false },
			};
			emit();
		},
		markCostsStale() {
			snapshot = {
				...snapshot,
				stale: { ...snapshot.stale, costs: true },
			};
			emit();
		},
		markRequirementsStale() {
			snapshot = {
				...snapshot,
				stale: { ...snapshot.stale, requirements: true },
			};
			emit();
		},
		markGroupsStale() {
			snapshot = {
				...snapshot,
				stale: { ...snapshot.stale, groups: true },
			};
			emit();
		},
	};
})();

vi.mock('../../src/state/sessionActionMetadataStore', () => ({
	readSessionActionMetadata: (
		_sessionId: string,
		_actionId: string,
		_params?: unknown,
	) => metadataStoreMock.read(),
	subscribeSessionActionMetadata: (
		_sessionId: string,
		_actionId: string,
		_params: unknown,
		listener: MetadataListener,
	) => metadataStoreMock.subscribe(listener),
	setSessionActionCosts: (
		_sessionId: string,
		_actionId: string,
		costs: SessionActionCostMap,
		_params?: unknown,
	) => metadataStoreMock.setCosts(costs),
	setSessionActionRequirements: (
		_sessionId: string,
		_actionId: string,
		requirements: SessionActionRequirementList,
		_params?: unknown,
	) => metadataStoreMock.setRequirements(requirements),
	setSessionActionOptions: (
		_sessionId: string,
		_actionId: string,
		groups: ActionEffectGroup[],
	) => metadataStoreMock.setGroups(groups),
}));

const sessionSdkMocks = vi.hoisted(() => {
	const loadActionCostsMock = vi.fn(
		(
			_sessionId: string,
			_actionId: string,
			_params?: unknown,
		): Promise<SessionActionCostMap> => {
			metadataStoreMock.setCosts(COSTS_VALUE);
			return Promise.resolve(COSTS_VALUE);
		},
	);
	const loadActionRequirementsMock = vi.fn(
		(
			_sessionId: string,
			_actionId: string,
			_params?: unknown,
		): Promise<SessionActionRequirementList> => {
			metadataStoreMock.setRequirements(REQUIREMENTS_VALUE);
			return Promise.resolve(REQUIREMENTS_VALUE);
		},
	);
	const loadActionOptionsMock = vi.fn(
		(_sessionId: string, _actionId: string): Promise<ActionEffectGroup[]> => {
			metadataStoreMock.setGroups(GROUPS_VALUE);
			return Promise.resolve(GROUPS_VALUE);
		},
	);
	return {
		loadActionCostsMock,
		loadActionRequirementsMock,
		loadActionOptionsMock,
		module: {
			loadActionCosts: loadActionCostsMock,
			loadActionRequirements: loadActionRequirementsMock,
			loadActionOptions: loadActionOptionsMock,
		},
	};
});

const loadActionCostsMock = sessionSdkMocks.loadActionCostsMock;
const loadActionRequirementsMock = sessionSdkMocks.loadActionRequirementsMock;
const loadActionOptionsMock = sessionSdkMocks.loadActionOptionsMock;

vi.mock('../../src/state/sessionSdk', () => sessionSdkMocks.module);

const gameEngineMock = { sessionId: 'session:test' } as const;

vi.mock('../../src/state/GameContext', () => ({
	useGameEngine: () => gameEngineMock,
}));

const COSTS_VALUE: SessionActionCostMap = { gold: 3 };
const REQUIREMENTS_VALUE: SessionActionRequirementList = [];
const GROUPS_VALUE: ActionEffectGroup[] = [];

describe('useActionMetadata', () => {
	beforeEach(() => {
		metadataStoreMock.reset();
		loadActionCostsMock.mockClear();
		loadActionRequirementsMock.mockClear();
		loadActionOptionsMock.mockClear();
	});

	it('refetches metadata when caches are marked stale', async () => {
		const { result } = renderHook(() =>
			useActionMetadata({ actionId: 'action.test' }),
		);
		await waitFor(() => {
			expect(loadActionCostsMock).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(loadActionRequirementsMock).toHaveBeenCalledTimes(1);
		});
		await waitFor(() => {
			expect(loadActionOptionsMock).toHaveBeenCalledTimes(1);
		});
		expect(result.current.costs).toBe(COSTS_VALUE);
		expect(result.current.requirements).toBe(REQUIREMENTS_VALUE);
		expect(result.current.groups).toBe(GROUPS_VALUE);
		act(() => {
			metadataStoreMock.markCostsStale();
		});
		await waitFor(() => {
			expect(loadActionCostsMock).toHaveBeenCalledTimes(2);
		});
		act(() => {
			metadataStoreMock.markRequirementsStale();
		});
		await waitFor(() => {
			expect(loadActionRequirementsMock).toHaveBeenCalledTimes(2);
		});
		act(() => {
			metadataStoreMock.markGroupsStale();
		});
		await waitFor(() => {
			expect(loadActionOptionsMock).toHaveBeenCalledTimes(2);
		});
	});
});
