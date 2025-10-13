import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import { SessionMetadataEnricher } from '../src/transport/SessionMetadataEnricher.js';

type SessionMetadataBundle = {
	resources?: SessionSnapshotMetadata['resources'];
	populations?: SessionSnapshotMetadata['populations'];
	buildings?: SessionSnapshotMetadata['buildings'];
	developments?: SessionSnapshotMetadata['developments'];
	stats?: SessionSnapshotMetadata['stats'];
	phases?: SessionSnapshotMetadata['phases'];
	triggers?: SessionSnapshotMetadata['triggers'];
	assets?: SessionSnapshotMetadata['assets'];
	developerPresetPlan?: unknown;
};

const mockBuildSessionMetadata = vi.hoisted(() =>
	vi.fn<[], SessionMetadataBundle>(),
) as Mock<[], SessionMetadataBundle>;

vi.mock('../src/content/buildSessionMetadata.js', () => ({
	buildSessionMetadata: mockBuildSessionMetadata,
}));

const createSnapshot = (
	metadata: SessionSnapshotMetadata,
): SessionSnapshot => ({
	game: {
		turn: 0,
		currentPlayerIndex: 0,
		currentPhase: 'phase:main',
		currentStep: 'step:start',
		phaseIndex: 0,
		stepIndex: 0,
		devMode: false,
		players: [
			{
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
			},
			{
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
			},
		],
		activePlayerId: 'A',
		opponentId: 'B',
	},
	phases: [],
	actionCostResource: 'resource:action',
	recentResourceGains: [],
	compensations: {
		A: { resources: {}, stats: {}, population: {}, lands: [] },
		B: { resources: {}, stats: {}, population: {}, lands: [] },
	},
	rules: {
		tieredResourceKey: 'resource:action',
		tierDefinitions: [],
		winConditions: [],
	},
	passiveRecords: { A: [], B: [] },
	metadata,
});

const createBundle = (
	partial: Partial<SessionMetadataBundle>,
): SessionMetadataBundle => ({
	resources: undefined,
	populations: undefined,
	buildings: undefined,
	developments: undefined,
	stats: undefined,
	phases: undefined,
	triggers: undefined,
	assets: undefined,
	...partial,
});

describe('SessionMetadataEnricher', () => {
	beforeEach(() => {
		mockBuildSessionMetadata.mockReset();
	});

	it('returns the original snapshot when the metadata bundle adds nothing and caches the bundle', () => {
		mockBuildSessionMetadata.mockReturnValue(createBundle({}));
		const snapshot = createSnapshot({
			passiveEvaluationModifiers: {},
			resources: { 'session:resource': { label: 'Session Resource' } },
		});
		const enricher = new SessionMetadataEnricher();
		const first = enricher.enrich(snapshot);
		const second = enricher.enrich(snapshot);
		expect(first).toBe(snapshot);
		expect(second).toBe(snapshot);
		expect(mockBuildSessionMetadata).toHaveBeenCalledTimes(1);
	});

	it('merges bundle metadata while preserving existing session overrides', () => {
		mockBuildSessionMetadata.mockReturnValue(
			createBundle({
				resources: {
					'session:resource': { label: 'Bundle Resource' },
					'bundle:extra': { label: 'Extra Resource' },
				},
				buildings: {
					'bundle:building': { label: 'Bundle Building' },
				},
				phases: {
					'growth:phase': { label: 'Bundle Growth' },
					'harvest:phase': { label: 'Harvest' },
				},
				triggers: {
					'growth:trigger': { future: 'Bundle Future' },
				},
				assets: {
					land: { label: 'Bundle Land' },
				},
			}),
		);
		const snapshot = createSnapshot({
			passiveEvaluationModifiers: {},
			resources: { 'session:resource': { label: 'Session Resource' } },
			phases: {
				'growth:phase': { label: 'Session Growth' },
			},
			triggers: {
				'growth:trigger': { past: 'Session Past' },
			},
		});
		const enricher = new SessionMetadataEnricher();
		const enriched = enricher.enrich(snapshot);
		expect(enriched).not.toBe(snapshot);
		expect(enriched.metadata.resources).toEqual({
			'session:resource': { label: 'Session Resource' },
			'bundle:extra': { label: 'Extra Resource' },
		});
		expect(enriched.metadata.buildings).toEqual({
			'bundle:building': { label: 'Bundle Building' },
		});
		expect(enriched.metadata.phases).toEqual({
			'growth:phase': { label: 'Session Growth' },
			'harvest:phase': { label: 'Harvest' },
		});
		expect(enriched.metadata.triggers).toEqual({
			'growth:trigger': { past: 'Session Past' },
		});
		expect(enriched.metadata.assets).toEqual({
			land: { label: 'Bundle Land' },
		});
	});

	it('removes metadata keys that resolve to undefined after merging', () => {
		mockBuildSessionMetadata.mockReturnValue(
			createBundle({
				resources: { 'bundle:new': { label: 'Bundle New' } },
			}),
		);
		const snapshot = createSnapshot({
			passiveEvaluationModifiers: {},
			assets: undefined,
		});
		const enricher = new SessionMetadataEnricher();
		const enriched = enricher.enrich(snapshot);
		expect(enriched).not.toBe(snapshot);
		expect('assets' in enriched.metadata).toBe(false);
		expect(enriched.metadata.resources).toEqual({
			'bundle:new': { label: 'Bundle New' },
		});
	});
});
