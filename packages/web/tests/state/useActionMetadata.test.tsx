/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ActionsPanelTestHarness } from '../helpers/actionsPanel.types';
import { createActionsPanelGame } from '../helpers/actionsPanel';
import { useActionMetadata } from '../../src/state/useActionMetadata';
import { clearSessionStateStore } from '../../src/state/sessionStateStore';
import { deleteRemoteAdapter } from '../../src/state/remoteSessionAdapter';
import { setGameApi } from '../../src/state/gameApiInstance';
import { createGameApiMock } from '../../src/services/gameApi.mocks';
import React from 'react';

let activeSessionId: string | null = null;

vi.mock('../../src/state/GameContext', () => ({
	useGameEngine: () => ({
		sessionId: activeSessionId ?? '',
	}),
}));

function MetadataProbe({ actionId }: { actionId: string }) {
	const metadata = useActionMetadata({ actionId });
	return (
		<div>
			<div data-testid="costs">
				{metadata.costs ? JSON.stringify(metadata.costs) : ''}
			</div>
			<div data-testid="requirements">
				{metadata.requirements ? JSON.stringify(metadata.requirements) : ''}
			</div>
			<div data-testid="loading-costs">{String(metadata.loading.costs)}</div>
			<div data-testid="loading-requirements">
				{String(metadata.loading.requirements)}
			</div>
		</div>
	);
}

describe('useActionMetadata integration', () => {
	let harness: ActionsPanelTestHarness;

	beforeEach(() => {
		clearSessionStateStore();
		harness = createActionsPanelGame();
		activeSessionId = harness.sessionId;
		deleteRemoteAdapter(harness.sessionId);
		setGameApi(createMockGameApi(harness));
	});

	afterEach(() => {
		setGameApi(null);
		clearSessionStateStore();
		activeSessionId = null;
	});

	it('loads costs and requirements after subscribing to metadata', async () => {
		const actionId = harness.metadata.actions.basic.id;
		render(<MetadataProbe actionId={actionId} />);

		const expectedCosts = harness.metadata.costMap.get(actionId) ?? {};
		const expectedRequirements =
			harness.metadata.requirementFailures.get(actionId) ?? [];

		await waitFor(() => {
			expect(screen.getByTestId('costs')).toHaveTextContent(
				JSON.stringify(expectedCosts),
			);
		});

		await waitFor(() => {
			expect(screen.getByTestId('requirements')).toHaveTextContent(
				JSON.stringify(expectedRequirements),
			);
		});

		expect(screen.getByTestId('loading-costs')).toHaveTextContent('false');
		expect(screen.getByTestId('loading-requirements')).toHaveTextContent(
			'false',
		);
	});
});

function createMockGameApi(harness: ActionsPanelTestHarness) {
	const { metadata } = harness;
	return createGameApiMock({
		getActionCosts: (request) =>
			Promise.resolve({
				sessionId: request.sessionId,
				actionId: request.actionId,
				costs: metadata.costMap.get(request.actionId) ?? {},
			}),
		getActionRequirements: (request) =>
			Promise.resolve({
				sessionId: request.sessionId,
				actionId: request.actionId,
				requirements: metadata.requirementFailures.get(request.actionId) ?? [],
			}),
		getActionOptions: (request) =>
			Promise.resolve({
				sessionId: request.sessionId,
				actionId: request.actionId,
				groups: [],
			}),
	});
}
