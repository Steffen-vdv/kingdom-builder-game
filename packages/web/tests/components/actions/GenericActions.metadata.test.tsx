/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenericActions from '../../../src/components/actions/GenericActions';
import { createPassiveGame } from '../../helpers/createPassiveDisplayGame';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../../helpers/sessionFixtures';
import { createTestSessionScaffold } from '../../helpers/testSessionScaffold';
import { createRemoteSessionAdapter } from '../../helpers/remoteSessionAdapter';
import { createSessionRegistriesPayload } from '../../helpers/sessionRegistries';
import {
	createTestRegistryMetadata,
	type TestRegistryMetadataSelectors,
} from '../../helpers/registryMetadata';
import type { LegacyGameEngineContextValue } from '../../../src/state/GameContext.types';
import type { Action } from '../../../src/components/actions/types';
import type { Summary } from '../../../src/translation';
import type { SessionPlayerId } from '@kingdom-builder/protocol/session';
import {
	setGameApi,
	fetchActionCosts,
	fetchActionRequirements,
	fetchActionOptions,
} from '../../../src/state/sessionSdk';

const escapeRegExp = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type ResourceDescriptorSelector =
	TestRegistryMetadataSelectors['resourceMetadata']['select'];

let currentGame: LegacyGameEngineContextValue;
let cleanupAdapter: (() => void) | null = null;
let cleanupApi: (() => void) | null = null;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

describe('<GenericActions /> metadata integration', () => {
	const scaffold = createTestSessionScaffold();
	const registriesPayload = createSessionRegistriesPayload();
	const [resourceKey] = Object.keys(registriesPayload.resources ?? {});
	if (!resourceKey) {
		throw new Error('Expected at least one resource key.');
	}
	const [actionId] = scaffold.registries.actions.keys();
	if (!actionId) {
		throw new Error('Expected available actions in registries.');
	}

	let action: Action;
	let selectResourceDescriptor: ResourceDescriptorSelector;
	let activePlayerView: LegacyGameEngineContextValue['sessionView']['active'];

	beforeEach(() => {
		const activePlayer = createSnapshotPlayer({
			id: 'P1' as SessionPlayerId,
			name: 'Player One',
			resources: { [resourceKey]: 10 },
			actions: [actionId],
		});
		const opponent = createSnapshotPlayer({
			id: 'P2' as SessionPlayerId,
			name: 'Player Two',
			resources: { [resourceKey]: 6 },
		});
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
			phases: scaffold.phases,
			actionCostResource: resourceKey,
			ruleSnapshot: scaffold.ruleSnapshot,
		});
		const { mockGame } = createPassiveGame(sessionState, {
			ruleSnapshot: scaffold.ruleSnapshot,
			registries: scaffold.registries,
			metadata: scaffold.metadata,
		});
		const sessionId = mockGame.sessionId;
		const { adapter, api, cleanup } = createRemoteSessionAdapter({
			sessionId,
			snapshot: sessionState,
			registries: registriesPayload,
		});
		cleanupAdapter = cleanup;
		setGameApi(api);
		cleanupApi = () => setGameApi(null);
		mockGame.session = adapter;
		mockGame.sessionState = sessionState;
		mockGame.requests.fetchActionCosts = (actionKey, params) =>
			fetchActionCosts({ sessionId, actionId: actionKey, params });
		mockGame.requests.fetchActionRequirements = (actionKey, params) =>
			fetchActionRequirements({ sessionId, actionId: actionKey, params });
		mockGame.requests.fetchActionOptions = (actionKey, params) =>
			fetchActionOptions({ sessionId, actionId: actionKey, params });
		currentGame = mockGame;

		const actionOption = mockGame.sessionView.actions.get(actionId);
		if (!actionOption) {
			throw new Error('Expected action option for active player.');
		}
		action = {
			...actionOption,
			id: actionOption.id,
			name: actionOption.name,
			system: actionOption.system,
			focus: actionOption.focus,
		} as Action;

		const metadataSelectors = createTestRegistryMetadata(
			scaffold.registries,
			scaffold.metadata,
		);
		selectResourceDescriptor = (key: string) =>
			metadataSelectors.resourceMetadata.select(key);

		activePlayerView = mockGame.sessionView.active;
		if (!activePlayerView) {
			throw new Error('Expected active player view.');
		}

		api.setNextActionCostResponse({
			sessionId,
			costs: { [resourceKey]: 5 },
		});
		api.setNextActionRequirementResponse({
			sessionId,
			requirements: [
				{
					requirement: { type: 'mock', method: 'test' },
					message: 'Need more workers.',
				},
			],
		});
		api.setNextActionOptionsResponse({
			sessionId,
			groups: [
				{
					id: 'group-1',
					title: 'Choose a reward',
					options: [
						{
							id: 'option-1',
							label: 'Take reward',
							actionId: action.id,
						},
					],
				},
			],
		});
	});

	afterEach(() => {
		if (cleanupAdapter) {
			cleanupAdapter();
			cleanupAdapter = null;
		}
		if (cleanupApi) {
			cleanupApi();
			cleanupApi = null;
		}
	});

	it('renders fetched costs, requirements, and options for an action', async () => {
		const summaries = new Map<string, Summary>();
		render(
			<GenericActions
				actions={[action]}
				summaries={summaries}
				player={activePlayerView!}
				canInteract={true}
				selectResourceDescriptor={selectResourceDescriptor}
			/>,
		);

		expect(await screen.findByText('🧪5')).toBeInTheDocument();
		expect(await screen.findByText('Need more workers.')).toBeInTheDocument();

		const user = userEvent.setup();
		const actionButton = await screen.findByRole('button', {
			name: new RegExp(escapeRegExp(action.name), 'i'),
		});
		await user.click(actionButton);

		expect(await screen.findByText('Choose a reward')).toBeInTheDocument();
		expect(
			await screen.findByRole('button', { name: /Take reward/i }),
		).toBeInTheDocument();
	});
});
