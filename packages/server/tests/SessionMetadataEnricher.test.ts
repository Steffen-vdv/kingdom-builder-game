import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import { SessionMetadataEnricher } from '../src/transport/SessionMetadataEnricher.js';
import { buildSessionMetadata } from '../src/content/buildSessionMetadata.js';

vi.mock('../src/content/buildSessionMetadata.js', () => ({
	buildSessionMetadata: vi.fn(),
}));

const mockedBuildSessionMetadata = vi.mocked(buildSessionMetadata);

const createSnapshot = (
	metadata: Partial<SessionSnapshotMetadata>,
): SessionSnapshot => {
	return {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: 'phase',
			currentStep: 'step',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players: [
				{
					id: 'player-1',
					name: 'Player One',
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
				},
			],
			activePlayerId: 'player-1',
			opponentId: 'player-1',
		},
		phases: [],
		actionCostResource: 'gold',
		recentResourceGains: [],
		compensations: {},
		rules: {
			tieredResourceKey: 'happiness',
			tierDefinitions: [],
			winConditions: [],
		},
		passiveRecords: {},
		metadata: {
			passiveEvaluationModifiers: {},
			...metadata,
		},
	};
};

describe('SessionMetadataEnricher', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns the original snapshot when no metadata additions exist', () => {
		const snapshot = createSnapshot({
			resources: {
				gold: { label: 'Gold' } satisfies SessionMetadataDescriptor,
			},
			buildings: {
				castle: { label: 'Castle' } satisfies SessionMetadataDescriptor,
			},
			stats: {
				happiness: { label: 'Happiness' } satisfies SessionMetadataDescriptor,
			},
			triggers: {
				growth: { label: 'Growth' } satisfies SessionTriggerMetadata,
			},
			assets: {
				population: { label: 'Population' } satisfies SessionMetadataDescriptor,
			},
		});
		mockedBuildSessionMetadata.mockReturnValue({
			resources: undefined,
			populations: undefined,
			buildings: undefined,
			developments: undefined,
			stats: undefined,
			phases: undefined,
			triggers: undefined,
			assets: undefined,
		});
		const enricher = new SessionMetadataEnricher();

		const result = enricher.enrich(snapshot);

		expect(result).toBe(snapshot);
		expect(mockedBuildSessionMetadata).toHaveBeenCalledTimes(1);
	});

	it('merges metadata additions and caches the generated bundle', () => {
		const bundlePhases: Record<string, SessionPhaseMetadata> = {
			growth: { id: 'growth', label: 'Growth' },
		};
		const bundleTriggers: Record<string, SessionTriggerMetadata> = {
			growth: { label: 'Growth' },
			harvest: { label: 'Harvest' },
		};
		const bundle = {
			resources: {
				wood: { label: 'Wood' } satisfies SessionMetadataDescriptor,
			},
			populations: {
				citizen: { label: 'Citizen' } satisfies SessionMetadataDescriptor,
			},
			buildings: {
				castle: { label: 'Bundle Castle' } satisfies SessionMetadataDescriptor,
				forge: { label: 'Forge' } satisfies SessionMetadataDescriptor,
			},
			developments: undefined,
			stats: {
				strength: { label: 'Strength' } satisfies SessionMetadataDescriptor,
			},
			phases: bundlePhases,
			triggers: bundleTriggers,
			assets: {
				overview: { label: 'Overview' } satisfies SessionMetadataDescriptor,
			},
		};
		mockedBuildSessionMetadata.mockReturnValue(bundle);
		const snapshot = createSnapshot({
			resources: {
				gold: { label: 'Gold' } satisfies SessionMetadataDescriptor,
			},
			buildings: {
				castle: { label: 'Castle' } satisfies SessionMetadataDescriptor,
			},
			stats: {
				happiness: { label: 'Happiness' } satisfies SessionMetadataDescriptor,
			},
			triggers: {
				growth: { label: 'Existing Growth' } satisfies SessionTriggerMetadata,
			},
		});
		const enricher = new SessionMetadataEnricher();

		const enriched = enricher.enrich(snapshot);
		const next = enricher.enrich(
			createSnapshot({
				resources: {} satisfies Record<string, SessionMetadataDescriptor>,
			}),
		);

		expect(enriched).not.toBe(snapshot);
		expect(enriched.metadata.resources).toEqual({
			wood: { label: 'Wood' },
			gold: { label: 'Gold' },
		});
		expect(enriched.metadata.buildings).toEqual({
			castle: { label: 'Castle' },
			forge: { label: 'Forge' },
		});
		expect(enriched.metadata.populations).toBe(bundle.populations);
		expect(enriched.metadata.phases).toBe(bundlePhases);
		expect(enriched.metadata.triggers).toEqual({
			growth: { label: 'Existing Growth' },
			harvest: { label: 'Harvest' },
		});
		expect(enriched.metadata.assets).toBe(bundle.assets);
		expect(enriched.metadata.stats).toEqual({
			strength: { label: 'Strength' },
			happiness: { label: 'Happiness' },
		});
		expect(enriched.metadata.developments).toBeUndefined();
		expect(snapshot.metadata.resources).toEqual({
			gold: { label: 'Gold' },
		});
		expect(mockedBuildSessionMetadata).toHaveBeenCalledTimes(1);
		expect(next.metadata.assets).toBe(bundle.assets);
	});
});
