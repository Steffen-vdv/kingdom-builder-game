import { describe, it, expectTypeOf } from 'vitest';
import type {
	PlayerSnapshotDeltaBucket,
	SessionAdvanceResult,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SimulateUpcomingPhasesIds,
	SimulateUpcomingPhasesOptions,
	SimulateUpcomingPhasesResult,
} from '../src/session';

describe('simulate upcoming phases protocol types', () => {
	it('describes the delta bucket structure', () => {
		expectTypeOf<PlayerSnapshotDeltaBucket>().toEqualTypeOf<{
			values: Record<string, number>;
		}>();
	});

	it('links simulation results to session snapshots', () => {
		expectTypeOf<
			SimulateUpcomingPhasesResult['playerId']
		>().toEqualTypeOf<SessionPlayerId>();
		expectTypeOf<
			SimulateUpcomingPhasesResult['before']
		>().toEqualTypeOf<SessionPlayerStateSnapshot>();
		expectTypeOf<
			SimulateUpcomingPhasesResult['after']
		>().toEqualTypeOf<SessionPlayerStateSnapshot>();
		expectTypeOf<SimulateUpcomingPhasesResult['steps']>().toEqualTypeOf<
			SessionAdvanceResult[]
		>();
		expectTypeOf<
			SimulateUpcomingPhasesResult['delta']
		>().toEqualTypeOf<PlayerSnapshotDeltaBucket>();
	});

	it('captures option bag relationships', () => {
		expectTypeOf<SimulateUpcomingPhasesOptions['phaseIds']>().toEqualTypeOf<
			SimulateUpcomingPhasesIds | undefined
		>();
	});
});
