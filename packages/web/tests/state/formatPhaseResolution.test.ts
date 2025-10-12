import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	SessionAdvanceResult,
	SessionPhaseDefinition,
	SessionPhaseStepDefinition,
} from '@kingdom-builder/protocol/session';
import type {
	PlayerSnapshot,
	TranslationDiffContext,
} from '../../src/translation';

vi.mock('../../src/translation', () => ({
	__esModule: true,
	diffStepSnapshots:
		vi.fn<
			(
				before: PlayerSnapshot,
				after: PlayerSnapshot,
				effects: unknown,
				diffContext: TranslationDiffContext,
				resourceKeys?: SessionResourceKey[],
			) => string[]
		>(),
	snapshotPlayer: vi.fn(),
}));

vi.mock('../../src/utils/describeSkipEvent', () => ({
	__esModule: true,
	describeSkipEvent: vi.fn(),
}));

import { formatPhaseResolution } from '../../src/state/formatPhaseResolution';
import { diffStepSnapshots } from '../../src/translation';
import { describeSkipEvent } from '../../src/utils/describeSkipEvent';
import type { SessionResourceKey } from '../../src/state/sessionTypes';

const diffStepSnapshotsMock = vi.mocked(diffStepSnapshots);
const describeSkipEventMock = vi.mocked(describeSkipEvent);

function createPlayerSnapshot(
	resources: Record<string, number>,
): PlayerSnapshot {
	return {
		resources,
		stats: {},
		population: {},
		buildings: [],
		lands: [],
		passives: [],
	};
}

describe('formatPhaseResolution', () => {
	beforeEach(() => {
		diffStepSnapshotsMock.mockReset();
		describeSkipEventMock.mockReset();
	});

	it('formats a standard phase step with change lines and summaries', () => {
		const advance: SessionAdvanceResult = {
			phase: 'growth',
			step: 'income',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'gold', amount: 2 },
				},
			],
			player: {} as SessionAdvanceResult['player'],
		};
		const phaseDefinition: SessionPhaseDefinition = {
			id: 'growth',
			steps: [],
			icon: '🌱',
			label: 'Growth',
		};
		const stepDefinition: SessionPhaseStepDefinition = {
			id: 'income',
			title: 'Collect income',
			effects: [],
		};
		const before = createPlayerSnapshot({ gold: 5 });
		const after = createPlayerSnapshot({ gold: 7 });
		const diffContext = {} as TranslationDiffContext;
		const resourceKeys = ['gold' as SessionResourceKey];
		diffStepSnapshotsMock.mockReturnValue(['Gold +2 (5→7)']);

		const result = formatPhaseResolution({
			advance,
			before,
			after,
			phaseDefinition,
			stepDefinition,
			diffContext,
			resourceKeys,
		});

		expect(diffStepSnapshotsMock).toHaveBeenCalledTimes(1);
		expect(diffStepSnapshotsMock).toHaveBeenCalledWith(
			before,
			after,
			{ effects: advance.effects },
			diffContext,
			resourceKeys,
		);
		expect(result.source).toEqual({
			kind: 'phase',
			label: '🌱 Growth Phase',
			icon: '🌱',
			id: 'growth',
			name: 'Collect income',
		});
		expect(result.actorLabel).toBe('Growth Phase');
		expect(result.lines).toEqual([
			'🌱 Growth Phase – Collect income',
			'Gold +2 (5→7)',
		]);
		expect(result.summaries).toEqual(['Gold +2 (5→7)']);
	});

	it('falls back to definition effects when advance has none', () => {
		const advance: SessionAdvanceResult = {
			phase: 'growth',
			step: 'income',
			effects: [],
			player: {} as SessionAdvanceResult['player'],
		};
		const stepDefinition: SessionPhaseStepDefinition = {
			id: 'income',
			title: 'Collect income',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: 'gold', amount: 1 },
				},
			],
		};
		const before = createPlayerSnapshot({ gold: 5 });
		const after = createPlayerSnapshot({ gold: 6 });
		diffStepSnapshotsMock.mockReturnValue(['Gold +1 (5→6)']);

		formatPhaseResolution({
			advance,
			before,
			after,
			stepDefinition,
			diffContext: {} as TranslationDiffContext,
		});

		expect(diffStepSnapshotsMock).toHaveBeenCalledWith(
			before,
			after,
			{ effects: stepDefinition.effects },
			expect.any(Object),
			undefined,
		);
	});

	it('formats skipped steps with skip messaging', () => {
		const advance: SessionAdvanceResult = {
			phase: 'growth',
			step: 'income',
			effects: [],
			player: {} as SessionAdvanceResult['player'],
			skipped: {
				type: 'step',
				phaseId: 'growth',
				stepId: 'income',
				sources: [],
			},
		};
		describeSkipEventMock.mockReturnValue({
			logLines: ['⏭️ Growth Phase skipped'],
			history: {
				title: 'Collect income',
				items: [{ text: 'Skipped due to fatigue' }],
			},
		});

		const result = formatPhaseResolution({
			advance,
			before: createPlayerSnapshot({ gold: 5 }),
			phaseDefinition: { id: 'growth', steps: [], label: 'Growth', icon: '🌱' },
			diffContext: {} as TranslationDiffContext,
		});

		expect(diffStepSnapshotsMock).not.toHaveBeenCalled();
		expect(describeSkipEventMock).toHaveBeenCalledTimes(1);
		expect(result.lines).toEqual(['⏭️ Growth Phase skipped']);
		expect(result.summaries).toEqual(['Skipped due to fatigue']);
		expect(result.actorLabel).toBe('Growth Phase');
	});

	it('adds a no-effect message when nothing changes', () => {
		const advance: SessionAdvanceResult = {
			phase: 'growth',
			step: 'income',
			effects: [],
			player: {} as SessionAdvanceResult['player'],
		};
		diffStepSnapshotsMock.mockReturnValue([]);

		const result = formatPhaseResolution({
			advance,
			before: createPlayerSnapshot({ gold: 5 }),
			diffContext: {} as TranslationDiffContext,
		});

		expect(result.lines).toEqual(['Growth Phase – Income', 'No effect']);
		expect(result.summaries).toEqual(['No effect']);
		expect(describeSkipEventMock).not.toHaveBeenCalled();
	});
});
