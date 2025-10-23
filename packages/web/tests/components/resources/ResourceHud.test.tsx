/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceValueSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type {
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import ResourceHud from '../../../src/components/resources/ResourceHud';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
	createEmptySnapshotMetadata,
} from '../../helpers/sessionFixtures';
import { createSessionRegistriesPayload } from '../../helpers/sessionRegistries';
import { deserializeSessionRegistries } from '../../../src/state/sessionRegistries';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import { createTranslationAssets } from '../../../src/translation/context/assets';
import type { TranslationContext } from '../../../src/translation/context';
import type { GameEngineContextValue } from '../../../src/state/GameContext.types';

type PlayerWithValues = SessionPlayerStateSnapshot & {
	values: Record<string, SessionResourceValueSnapshot>;
};

let mockGame: GameEngineContextValue;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

function getActivePlayerWithValues(): PlayerWithValues {
	return mockGame.sessionSnapshot.game.players[0] as PlayerWithValues;
}

const PARENT_GROUP_TEST_NAME =
	'renders parent groups before children and hides untouched zero values';

describe('ResourceHud', () => {
	beforeEach(() => {
		const tierTrack: ResourceV2TierTrackDefinition = {
			id: 'track:child',
			tiers: [
				{
					id: 'tier:one',
					range: { min: 0, max: 10 },
				} satisfies ResourceV2TierDefinition,
				{
					id: 'tier:two',
					range: { min: 11 },
				} satisfies ResourceV2TierDefinition,
			],
		};
		const parentTierTrack: ResourceV2TierTrackDefinition = {
			id: 'track:parent',
			tiers: [
				{
					id: 'tier:parent',
					range: { min: 0 },
				} satisfies ResourceV2TierDefinition,
			],
		};
		const beta = createResourceV2Definition({
			id: 'resource:beta',
			name: 'Beta',
			order: 1,
			group: { groupId: 'group:pair', order: 1 },
			displayAsPercent: true,
			bounds: { lowerBound: 0, upperBound: 50 },
			tierTrack,
		});
		const alpha = createResourceV2Definition({
			id: 'resource:alpha',
			name: 'Alpha',
			order: 2,
			group: { groupId: 'group:pair', order: 2 },
			bounds: { lowerBound: -5 },
		});
		const solo = createResourceV2Definition({
			id: 'resource:solo',
			name: 'Solo',
			order: 10,
		});
		const group = createResourceV2Group({
			id: 'group:pair',
			order: 1,
			parentId: 'resource:parent',
			parentName: 'Parent Resource',
			parentDescription: 'Parent description',
			parentBounds: { upperBound: 100 },
			parentTierTrack,
			children: [beta.id, alpha.id],
		});
		const registriesPayload = createSessionRegistriesPayload();
		registriesPayload.resources = {
			[beta.id]: { key: beta.id, label: 'Beta' },
			[alpha.id]: { key: alpha.id, label: 'Alpha' },
			[solo.id]: { key: solo.id, label: 'Solo' },
			[group.parent.id]: {
				key: group.parent.id,
				label: 'Parent Resource',
			},
		};
		registriesPayload.resourceDefinitions = [beta, alpha, solo];
		registriesPayload.resourceGroups = [group];
		const registries = deserializeSessionRegistries(registriesPayload);
		const ruleSnapshot: SessionRuleSnapshot = {
			tieredResourceKey: beta.id,
			tierDefinitions: [],
			winConditions: [],
		};
		const metadata = createEmptySnapshotMetadata({
			resources: {
				[beta.id]: { label: 'Beta', icon: '🅱️' },
				[alpha.id]: { label: 'Alpha', icon: '🅰️' },
				[solo.id]: { label: 'Solo', icon: '🆂' },
				[group.parent.id]: {
					label: 'Parent Resource',
					icon: '🅟',
				},
			},
		});
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: registries.resources,
				resourceDefinitions: registries.resourceDefinitions,
				resourceGroups: registries.resourceGroups,
			},
			metadata,
			{ rules: ruleSnapshot },
		);
		const parentValue: SessionResourceValueSnapshot = {
			amount: 55,
			touched: true,
			recentGains: [],
			tier: {
				trackId: parentTierTrack.id,
				tierId: 'tier:parent',
			},
		};
		const alphaValue: SessionResourceValueSnapshot = {
			amount: 20,
			touched: true,
			recentGains: [],
			parent: {
				id: group.parent.id,
				amount: parentValue.amount,
				touched: parentValue.touched,
				bounds: group.parent.bounds,
			},
		};
		const betaValue: SessionResourceValueSnapshot = {
			amount: 35,
			touched: false,
			recentGains: [],
			tier: {
				trackId: tierTrack.id,
				tierId: 'tier:one',
				nextTierId: 'tier:two',
			},
			parent: {
				id: group.parent.id,
				amount: parentValue.amount,
				touched: parentValue.touched,
				bounds: group.parent.bounds,
			},
		};
		const soloValue: SessionResourceValueSnapshot = {
			amount: 0,
			touched: false,
			recentGains: [],
		};
		const activePlayer = createSnapshotPlayer({
			id: 'A' as const,
			name: 'Player One',
		});
		const opponent = createSnapshotPlayer({
			id: 'B' as const,
			name: 'Opponent',
		});
		const activeWithValues = activePlayer as PlayerWithValues;
		activeWithValues.values = {
			[beta.id]: betaValue,
			[alpha.id]: alphaValue,
			[group.parent.id]: parentValue,
			[solo.id]: soloValue,
		};
		const sessionSnapshot: SessionSnapshot = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: 'A',
			opponentId: 'B',
			phases: [],
			actionCostResource: beta.id,
			ruleSnapshot,
			metadata,
		});
		const noopRegistry = {
			get: () => {
				throw new Error('not implemented');
			},
			has: () => false,
		} as TranslationContext['actions'];
		const translationContext: TranslationContext = {
			assets,
			actions: noopRegistry,
			actionCategories: {
				get: () => {
					throw new Error('not implemented');
				},
				has: () => false,
				list: () => [],
			},
			buildings: noopRegistry,
			developments: noopRegistry,
			populations: noopRegistry,
			passives: {
				list: () => [],
				get: () => undefined,
				getDefinition: () => undefined,
				definitions: () => [],
				evaluationMods: new Map(),
			},
			phases: [],
			activePlayer: {
				id: 'A',
				name: 'Player One',
				resources: {},
				stats: {},
				population: {},
			},
			opponent: {
				id: 'B',
				name: 'Opponent',
				resources: {},
				stats: {},
				population: {},
			},
			rules: ruleSnapshot,
			recentResourceGains: [],
			compensations: { A: {}, B: {} },
			pullEffectLog: () => undefined,
			actionCostResource: beta.id,
		};
		const sessionView = {
			list: [activePlayer, opponent],
			byId: new Map(),
			active: activePlayer,
			opponent,
		};
		mockGame = {
			sessionId: 'session',
			sessionSnapshot,
			cachedSessionSnapshot: sessionSnapshot,
			selectors: { sessionView },
			translationContext,
			ruleSnapshot,
			log: [],
			logOverflowed: false,
			resolution: null,
			showResolution: async () => {},
			acknowledgeResolution: () => {},
			hoverCard: null,
			handleHoverCard: () => {},
			clearHoverCard: () => {},
			phase: {
				id: 'phase',
				label: 'Phase',
				canEndTurn: false,
				isAdvancing: false,
				activePlayerId: 'A',
			},
			actionCostResource: beta.id,
			requests: {
				performAction: async () => {},
				advancePhase: async () => {},
				startSession: async () => {},
				refreshSession: async () => {},
			},
			metadata: {
				getRuleSnapshot: () => ruleSnapshot,
				getSessionView: () => mockGame.selectors.sessionView,
				getTranslationContext: () => translationContext,
			},
			runUntilActionPhase: async () => {},
			refreshPhaseState: () => {},
			onExit: undefined,
			darkMode: false,
			onToggleDark: () => {},
			musicEnabled: true,
			onToggleMusic: () => {},
			soundEnabled: true,
			onToggleSound: () => {},
			backgroundAudioMuted: true,
			onToggleBackgroundAudioMute: () => {},
			autoAdvanceEnabled: false,
			onToggleAutoAdvance: () => {},
			timeScale: 1,
			setTimeScale: () => {},
			controlKeybinds: {},
			setControlKeybind: () => {},
			resetControlKeybind: () => {},
			toasts: [],
			pushToast: () => {},
			pushErrorToast: () => {},
			pushSuccessToast: () => {},
			dismissToast: () => {},
			playerName: 'Player One',
			onChangePlayerName: () => {},
		} as unknown as GameEngineContextValue;
	});

	it(PARENT_GROUP_TEST_NAME, () => {
		const activePlayer = getActivePlayerWithValues();
		render(<ResourceHud player={activePlayer} />);
		const entries = screen.getAllByTestId('resource-hud-entry');
		expect(entries).toHaveLength(1);
		const parentEntry = entries[0];
		expect(parentEntry).toHaveAttribute('data-resource-id', 'resource:parent');
		expect(parentEntry).toHaveTextContent('Parent Resource');
		const childRows = within(parentEntry).getAllByTestId('resource-hud-child');
		expect(childRows).toHaveLength(2);
		expect(childRows[0]).toHaveAttribute('data-resource-id', 'resource:beta');
		expect(childRows[1]).toHaveAttribute('data-resource-id', 'resource:alpha');
		const standaloneVisible = entries.some(
			(entry) => entry.getAttribute('data-resource-id') === 'resource:solo',
		);
		expect(standaloneVisible).toBe(false);
	});

	it('formats percent values and displays tier and bound badges', () => {
		const activePlayer = getActivePlayerWithValues();
		render(<ResourceHud player={activePlayer} />);
		const betaRow = screen.getAllByTestId('resource-hud-child')[0];
		expect(betaRow).toHaveTextContent('35%');
		const badges = within(betaRow).getAllByText(/≥|≤/u);
		expect(badges).toHaveLength(2);
		const tierBadge = within(betaRow).getByText(/Tier:/u);
		expect(tierBadge).toHaveTextContent('tier:one');
		const parentEntry = screen.getAllByTestId('resource-hud-entry')[0];
		expect(within(parentEntry).getByText('≤ 100')).toBeInTheDocument();
		expect(
			within(parentEntry).getByText(/Tier: tier:parent/u),
		).toBeInTheDocument();
	});
});
