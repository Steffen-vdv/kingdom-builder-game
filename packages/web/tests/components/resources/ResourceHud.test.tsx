/** @vitest-environment jsdom */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol/session';
import {
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import type { ResourceV2TierTrackDefinition } from '@kingdom-builder/protocol';
import ResourceHud from '../../../src/components/resources/ResourceHud';
import { createSessionSnapshot } from '../../helpers/sessionFixtures';
import { createTestSessionScaffold } from '../../helpers/testSessionScaffold';
import { createSessionRegistriesPayload } from '../../helpers/sessionRegistries';
import { deserializeSessionRegistries } from '../../../src/state/sessionRegistries';
import { createTranslationContext } from '../../../src/translation/context/createTranslationContext';
import { selectSessionView } from '../../../src/state/sessionSelectors';
import type { GameEngineContextValue } from '../../../src/state/GameContext.types';

vi.mock('../../../src/state/GameContext', async () => {
	const actual = (await vi.importActual(
		'../../../src/state/GameContext',
	)) as Record<string, unknown>;
	return {
		...actual,
		useGameEngine: () => mockGame,
	};
});

let mockGame: GameEngineContextValue;

const HARVEST_GROUP_ID = 'resource-group.harvest';
const HARVEST_PARENT_ID = 'resource.harvest.total';

const HARVEST_TIER_TRACK: ResourceV2TierTrackDefinition = {
	id: 'track.harvest',
	tiers: [
		{
			id: 'tier.harvest.low',
			range: { min: 0, max: 9 },
			display: { title: 'Low Harvest' },
		},
		{
			id: 'tier.harvest.high',
			range: { min: 10 },
			display: { title: 'High Harvest' },
		},
	],
};

function createValues(): SessionResourceValueSnapshotMap {
	return {
		[HARVEST_PARENT_ID]: {
			amount: 30,
			touched: true,
			recentGains: [],
			tier: {
				trackId: HARVEST_TIER_TRACK.id,
				tierId: 'tier.harvest.high',
			},
		},
		grain: {
			amount: 10,
			touched: true,
			parent: {
				id: HARVEST_PARENT_ID,
				amount: 30,
				touched: true,
			},
			recentGains: [],
		},
		fruit: {
			amount: 20,
			touched: false,
			parent: {
				id: HARVEST_PARENT_ID,
				amount: 30,
				touched: true,
			},
			recentGains: [],
		},
		iron: {
			amount: 0,
			touched: false,
			recentGains: [],
		},
		morale: {
			amount: 55,
			touched: true,
			recentGains: [],
		},
	} satisfies SessionResourceValueSnapshotMap;
}

function setup(): void {
	const scaffold = createTestSessionScaffold();
	const grainDefinition = createResourceV2Definition({
		id: 'grain',
		name: 'Grain Stores',
		icon: '🌾',
		order: 2,
		bounds: { lowerBound: 0 },
		group: { groupId: HARVEST_GROUP_ID, order: 1 },
	});
	const fruitDefinition = createResourceV2Definition({
		id: 'fruit',
		name: 'Fruit Reserves',
		icon: '🍎',
		order: 3,
		group: { groupId: HARVEST_GROUP_ID, order: 2 },
	});
	const ironDefinition = createResourceV2Definition({
		id: 'iron',
		name: 'Iron Stockpile',
		icon: '⛏️',
		order: 4,
	});
	const moraleDefinition = createResourceV2Definition({
		id: 'morale',
		name: 'Morale',
		icon: '😊',
		order: 5,
		displayAsPercent: true,
	});
	const harvestGroup = createResourceV2Group({
		id: HARVEST_GROUP_ID,
		order: 1,
		parentId: HARVEST_PARENT_ID,
		parentName: 'Harvest Total',
		parentIcon: '🧺',
		parentBounds: { lowerBound: 0, upperBound: 50 },
		parentTierTrack: HARVEST_TIER_TRACK,
		children: [grainDefinition.id, fruitDefinition.id],
	});
	const registriesPayload = createSessionRegistriesPayload();
	registriesPayload.resourceDefinitions = [
		grainDefinition,
		fruitDefinition,
		ironDefinition,
		moraleDefinition,
	];
	registriesPayload.resourceGroups = [harvestGroup];
	const registries = deserializeSessionRegistries(registriesPayload);
	const metadata = structuredClone(scaffold.metadata);
	metadata.resources = {
		...(metadata.resources ?? {}),
		[grainDefinition.id]: {
			label: 'Grain Stores',
			icon: grainDefinition.display.icon,
		},
		[fruitDefinition.id]: {
			label: 'Fruit Reserves',
			icon: fruitDefinition.display.icon,
		},
		[ironDefinition.id]: {
			label: 'Iron Stockpile',
			icon: ironDefinition.display.icon,
		},
		[moraleDefinition.id]: {
			label: 'Morale',
			icon: moraleDefinition.display.icon,
			displayAsPercent: true,
		},
		[HARVEST_PARENT_ID]: {
			label: 'Harvest Total',
			icon: '🧺',
		},
	};
	const activePlayer: SessionPlayerStateSnapshot = {
		id: 'A',
		name: 'Player A',
		resources: {},
		stats: {},
		statsHistory: {},
		population: {},
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
		values: createValues(),
	};
	const opponent: SessionPlayerStateSnapshot = {
		id: 'B',
		name: 'Player B',
		resources: {},
		stats: {},
		statsHistory: {},
		population: {},
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	};
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: moraleDefinition.id,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	const translationContext = createTranslationContext(
		session,
		registries,
		metadata,
		{
			ruleSnapshot: scaffold.ruleSnapshot,
			passiveRecords: session.passiveRecords,
		},
	);
	const sessionView = selectSessionView(session, registries);
	mockGame = {
		sessionId: 'session',
		sessionSnapshot: session,
		cachedSessionSnapshot: session,
		selectors: { sessionView },
		translationContext,
		ruleSnapshot: scaffold.ruleSnapshot,
		log: [],
		logOverflowed: false,
		resolution: null,
		showResolution: vi.fn(),
		acknowledgeResolution: vi.fn(),
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		phase: {
			currentPhaseId: session.game.currentPhase,
			isActionPhase: false,
			canEndTurn: true,
			isAdvancing: false,
			awaitingManualStart: false,
			activePlayerId: session.game.activePlayerId,
			activePlayerName: activePlayer.name,
		},
		actionCostResource: moraleDefinition.id,
		requests: {
			performAction: vi.fn(),
			advancePhase: vi.fn(),
			startSession: vi.fn(),
			refreshSession: vi.fn(),
		},
		metadata: {
			getRuleSnapshot: () => scaffold.ruleSnapshot,
			getSessionView: () => sessionView,
			getTranslationContext: () => translationContext,
		},
		runUntilActionPhase: vi.fn(),
		refreshPhaseState: vi.fn(),
		onExit: undefined,
		darkMode: false,
		onToggleDark: vi.fn(),
		musicEnabled: true,
		onToggleMusic: vi.fn(),
		soundEnabled: true,
		onToggleSound: vi.fn(),
		backgroundAudioMuted: false,
		onToggleBackgroundAudioMute: vi.fn(),
		autoAdvanceEnabled: false,
		onToggleAutoAdvance: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
		controlKeybinds: {},
		setControlKeybind: vi.fn(),
		resetControlKeybind: vi.fn(),
		toasts: [],
		pushToast: vi.fn(),
		pushErrorToast: vi.fn(),
		pushSuccessToast: vi.fn(),
		dismissToast: vi.fn(),
		playerName: 'Player A',
		onChangePlayerName: vi.fn(),
	} as unknown as GameEngineContextValue;

	render(<ResourceHud player={activePlayer} />);
}

describe('<ResourceHud />', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders ResourceV2 parents with grouped children in order', () => {
		setup();
		const rows = screen.getAllByRole('listitem');
		const ids = rows.map((row) => row.getAttribute('data-resource-id'));
		expect(ids).toEqual(['resource.harvest.total', 'grain', 'fruit', 'morale']);
		const parentRow = rows[0];
		expect(within(parentRow).getByText('Harvest Total')).toBeInTheDocument();
		expect(within(parentRow).getByText('30')).toBeInTheDocument();
		const grainRow = rows[1];
		expect(within(grainRow).getByText('Grain Stores')).toBeInTheDocument();
		expect(within(grainRow).getByText('10')).toBeInTheDocument();
	});

	it('formats percent-based resources with a percent suffix', () => {
		setup();
		const matches = screen.getAllByText('55%');
		expect(matches.length).toBeGreaterThan(0);
		expect(matches[0]).toBeInTheDocument();
	});

	it('omits untouched zero-value resources', () => {
		setup();
		const rows = screen.getAllByRole('listitem');
		const ids = rows.map((row) => row.getAttribute('data-resource-id'));
		expect(ids).not.toContain('iron');
	});

	it('shows bound and tier badges', () => {
		setup();
		const parentLabel = screen.getAllByText('Harvest Total')[0];
		const parentRow = parentLabel.closest('li');
		expect(parentRow).not.toBeNull();
		const parentWithin = within(parentRow as HTMLElement);
		expect(parentWithin.getByText('≥0')).toBeInTheDocument();
		expect(parentWithin.getByText('≤50')).toBeInTheDocument();
		expect(parentWithin.getByText('Tier: High Harvest')).toBeInTheDocument();
		const grainLabel = screen.getAllByText('Grain Stores')[0];
		const grainRow = grainLabel.closest('li');
		expect(grainRow).not.toBeNull();
		expect(within(grainRow as HTMLElement).getByText('≥0')).toBeInTheDocument();
	});
});
