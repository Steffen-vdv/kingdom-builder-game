/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import { useActionMetadata } from '../../src/state/useActionMetadata';

const loadActionCosts = vi.fn<
	Promise<SessionActionCostMap>,
	[string, string, Record<string, unknown> | undefined]
>();
const loadActionRequirements = vi.fn<
	Promise<SessionActionRequirementList>,
	[string, string, Record<string, unknown> | undefined]
>();
const loadActionOptions = vi.fn<
	Promise<ActionEffectGroup[]>,
	[string, string]
>();

vi.mock('../../src/state/sessionSdk', () => ({
	loadActionCosts: (
		...args: Parameters<typeof loadActionCosts>
	): ReturnType<typeof loadActionCosts> => loadActionCosts(...args),
	loadActionRequirements: (
		...args: Parameters<typeof loadActionRequirements>
	): ReturnType<typeof loadActionRequirements> =>
		loadActionRequirements(...args),
	loadActionOptions: (
		...args: Parameters<typeof loadActionOptions>
	): ReturnType<typeof loadActionOptions> => loadActionOptions(...args),
}));

const actionId = 'test:action';
const params = { count: 2 } satisfies Record<string, unknown>;
let costs: SessionActionCostMap = {};
let requirements: SessionActionRequirementList = [];
let groups: ActionEffectGroup[] = [];
let costListener: (() => void) | null = null;
let requirementListener: (() => void) | null = null;
let optionListener: (() => void) | null = null;

const session = {
	getActionCosts: vi.fn(() => costs),
	hasActionCosts: vi.fn(() => {
		return costs !== undefined && Object.keys(costs).length > 0;
	}),
	subscribeActionCosts: vi.fn(
		(
			_actionId: string,
			_params: Record<string, unknown> | undefined,
			listener: () => void,
		) => {
			costListener = listener;
			return () => {
				costListener = null;
			};
		},
	),
	getActionRequirements: vi.fn(() => requirements),
	hasActionRequirements: vi.fn(
		() => requirements !== undefined && requirements.length > 0,
	),
	subscribeActionRequirements: vi.fn(
		(
			_actionId: string,
			_params: Record<string, unknown> | undefined,
			listener: () => void,
		) => {
			requirementListener = listener;
			return () => {
				requirementListener = null;
			};
		},
	),
	getActionOptions: vi.fn(() => groups),
	hasActionOptions: vi.fn(() => {
		return groups !== undefined && groups.length > 0;
	}),
	subscribeActionOptions: vi.fn((_action: string, listener: () => void) => {
		optionListener = listener;
		return () => {
			optionListener = null;
		};
	}),
};

vi.mock('../../src/state/GameContext', () => ({
	useGameEngine: () => ({ sessionId: 'session:test', session }),
}));

const MetadataProbe = () => {
	const metadata = useActionMetadata({ actionId, params });
	return (
		<div>
			<output data-testid="costs">
				{metadata.costs ? JSON.stringify(metadata.costs) : 'pending'}
			</output>
			<output data-testid="requirements">
				{metadata.requirements ? metadata.requirements.length : 'pending'}
			</output>
			<output data-testid="groups">
				{metadata.groups ? metadata.groups.length : 'pending'}
			</output>
		</div>
	);
};

describe('useActionMetadata', () => {
	beforeEach(() => {
		costs = {};
		requirements = [];
		groups = [];
		costListener = null;
		requirementListener = null;
		optionListener = null;
		loadActionCosts.mockReset();
		loadActionRequirements.mockReset();
		loadActionOptions.mockReset();
		session.getActionCosts.mockClear();
		session.hasActionCosts.mockClear();
		session.subscribeActionCosts.mockClear();
		session.getActionRequirements.mockClear();
		session.hasActionRequirements.mockClear();
		session.subscribeActionRequirements.mockClear();
		session.getActionOptions.mockClear();
		session.hasActionOptions.mockClear();
		session.subscribeActionOptions.mockClear();
	});

	it('loads metadata when caches empty', async () => {
		loadActionCosts.mockImplementation(async () => {
			costs = { gold: 3 } satisfies SessionActionCostMap;
			costListener?.();
			return costs;
		});
		loadActionRequirements.mockImplementation(async () => {
			requirements = [
				{
					id: 'req:example',
					type: 'resource',
					payload: {},
				},
			];
			requirementListener?.();
			return requirements;
		});
		loadActionOptions.mockImplementation(async () => {
			groups = [
				{
					id: 'group:example',
					layout: 'compact',
					options: [],
				},
			];
			optionListener?.();
			return groups;
		});

		render(<MetadataProbe />);

		await waitFor(() => {
			const expectedOptionsCall: [string, string] = ['session:test', actionId];
			expect(loadActionCosts).toHaveBeenCalledWith(
				'session:test',
				actionId,
				params,
			);
			expect(loadActionRequirements).toHaveBeenCalledWith(
				'session:test',
				actionId,
				params,
			);
			expect(loadActionOptions).toHaveBeenCalledWith(...expectedOptionsCall);
			expect(screen.getByTestId('costs')).toHaveTextContent('gold');
			expect(screen.getByTestId('requirements')).toHaveTextContent('1');
			expect(screen.getByTestId('groups')).toHaveTextContent('1');
		});
	});
});
