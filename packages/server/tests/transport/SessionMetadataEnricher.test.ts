import { describe, expect, it, beforeEach, vi } from 'vitest';
import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionMetadataDescriptor,
} from '@kingdom-builder/protocol';
import { createContentFactory } from '@kingdom-builder/testing';
import { SessionMetadataEnricher } from '../../src/transport/SessionMetadataEnricher.js';

interface TestSessionMetadataBundle {
	resources?: Record<string, SessionMetadataDescriptor>;
	populations?: Record<string, SessionMetadataDescriptor>;
	buildings?: Record<string, SessionMetadataDescriptor>;
	developments?: Record<string, SessionMetadataDescriptor>;
	stats?: Record<string, SessionMetadataDescriptor>;
	phases?: Record<string, unknown>;
	triggers?: Record<string, unknown>;
	assets?: Record<string, SessionMetadataDescriptor>;
	developerPresetPlan?: unknown;
}

const buildSessionMetadata = vi.hoisted(() =>
	vi.fn<[], TestSessionMetadataBundle>(),
);

vi.mock('../../src/content/buildSessionMetadata.js', () => ({
	buildSessionMetadata,
}));

describe('SessionMetadataEnricher', () => {
	beforeEach(() => {
		buildSessionMetadata.mockReset();
	});

	it('returns the original snapshot when no metadata additions are provided', () => {
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			assets: undefined,
		};
		const snapshot = createSnapshot(metadata);
		buildSessionMetadata.mockReturnValue({});

		const enricher = new SessionMetadataEnricher();
		const enriched = enricher.enrich(snapshot);

		expect(enriched).toBe(snapshot);
		expect(buildSessionMetadata).toHaveBeenCalledTimes(1);
	});

	it('merges metadata additions and caches the generated bundle', () => {
		const factory = createContentFactory();
		const baseResourceId = 'resource:' + factory.action().id;
		const newResourceId = 'resource:' + factory.development().id;
		const populationId = factory.population().id;

		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			resources: {
				[baseResourceId]: { label: 'Existing' },
			},
			assets: undefined,
		};
		const additions: TestSessionMetadataBundle = {
			resources: {
				[newResourceId]: { label: 'New resource' },
			},
			populations: {
				[populationId]: { label: 'Pop' },
			},
			assets: undefined,
		};
		buildSessionMetadata.mockReturnValue(additions);

		const enricher = new SessionMetadataEnricher();
		const snapshot = createSnapshot(metadata);
		const enriched = enricher.enrich(snapshot);

		expect(buildSessionMetadata).toHaveBeenCalledTimes(1);
		expect(enriched).not.toBe(snapshot);
		expect(enriched.metadata.resources).toEqual({
			[newResourceId]: { label: 'New resource' },
			[baseResourceId]: { label: 'Existing' },
		});
		expect(enriched.metadata.populations).toEqual({
			[populationId]: { label: 'Pop' },
		});
		const hasAssetsMetadata = 'assets' in enriched.metadata;
		expect(hasAssetsMetadata).toBe(false);

		const expectedResources = enriched.metadata.resources;
		const second = enricher.enrich(enriched);
		expect(buildSessionMetadata).toHaveBeenCalledTimes(1);
		expect(second.metadata.resources).toEqual(expectedResources);
	});
});

let snapshotCounter = 0;

function createSnapshot(metadata: SessionSnapshotMetadata): SessionSnapshot {
	snapshotCounter += 1;
	const playerId = `player:${snapshotCounter}`;
	return {
		game: {
			turn: 1,
			currentPlayerIndex: 0,
			currentPhase: 'phase:main',
			currentStep: 'step:start',
			phaseIndex: 0,
			stepIndex: 0,
			devMode: false,
			players: [
				{
					id: playerId,
					name: 'Test Player',
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
			activePlayerId: playerId,
			opponentId: playerId,
		},
		phases: [],
		actionCostResource: 'resource:action',
		recentResourceGains: [],
		compensations: {},
		rules: {
			tieredResourceKey: 'resource:action',
			tierDefinitions: [],
			winConditions: [],
		},
		passiveRecords: {},
		metadata,
	};
}
