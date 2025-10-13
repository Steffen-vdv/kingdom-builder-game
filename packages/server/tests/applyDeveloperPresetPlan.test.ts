import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineSession } from '@kingdom-builder/engine';
import type { SessionSnapshot } from '@kingdom-builder/protocol';

const buildSessionMetadataMock = vi.fn();

vi.mock('../src/content/buildSessionMetadata.js', () => ({
	buildSessionMetadata: buildSessionMetadataMock,
}));

const importPresetModule = async () => {
	vi.resetModules();
	return import('../src/session/applyDeveloperPresetPlan.js');
};

const createSession = (players: Array<{ id: string }>) => {
	const snapshot = {
		game: { players },
	} satisfies Pick<SessionSnapshot, 'game'>;
	const getSnapshot = vi.fn(() => snapshot as SessionSnapshot);
	const applyDeveloperPreset = vi.fn();
	const session = {
		getSnapshot,
		applyDeveloperPreset,
	} as Pick<EngineSession, 'getSnapshot' | 'applyDeveloperPreset'>;
	return {
		session: session as EngineSession,
		getSnapshot,
		applyDeveloperPreset,
	};
};

describe('applyDeveloperPresetPlan', () => {
	beforeEach(() => {
		buildSessionMetadataMock.mockReset();
	});

	it('does not change sessions when no developer preset exists', async () => {
		buildSessionMetadataMock.mockReturnValue({});
		const { applyDeveloperPresetPlan } = await importPresetModule();
		const { session, getSnapshot, applyDeveloperPreset } = createSession([
			{ id: 'player-1' },
		]);

		applyDeveloperPresetPlan(session);

		expect(getSnapshot).not.toHaveBeenCalled();
		expect(applyDeveloperPreset).not.toHaveBeenCalled();
		expect(buildSessionMetadataMock).toHaveBeenCalledTimes(1);
	});

	it('applies merged presets for each player and caches the plan', async () => {
		buildSessionMetadataMock.mockReturnValue({
			developerPresetPlan: {
				default: {
					resources: { gold: 10, ignore: Number.NaN },
					population: { worker: 2 },
					landCount: 3,
					developments: ['Farm', 'Farm'],
					buildings: ['Castle', ''],
				},
				players: {
					'player-1': {
						resources: { gold: 12 },
						population: { worker: 4 },
						buildings: [],
					},
					'player-2': {
						resources: { wood: 5 },
						population: {
							worker: 1,
							builder: Number.POSITIVE_INFINITY,
						},
						landCount: 5,
						developments: ['Mill', 'Mill'],
						buildings: ['Forge', 'Forge'],
					},
				},
			},
		});
		const { applyDeveloperPresetPlan } = await importPresetModule();
		const { session, applyDeveloperPreset } = createSession([
			{ id: 'player-1' },
			{ id: 'player-2' },
		]);

		applyDeveloperPresetPlan(session);
		const { session: nextSession } = createSession([{ id: 'player-3' }]);
		applyDeveloperPresetPlan(nextSession);

		expect(applyDeveloperPreset).toHaveBeenCalledTimes(2);
		expect(applyDeveloperPreset).toHaveBeenNthCalledWith(1, {
			playerId: 'player-1',
			resources: [{ key: 'gold', target: 12 }],
			population: [{ role: 'worker', count: 4 }],
			landCount: 3,
			developments: ['Farm'],
			buildings: ['Castle'],
		});
		expect(applyDeveloperPreset).toHaveBeenNthCalledWith(2, {
			playerId: 'player-2',
			resources: [
				{ key: 'gold', target: 10 },
				{ key: 'wood', target: 5 },
			],
			population: [{ role: 'worker', count: 1 }],
			landCount: 5,
			developments: ['Mill'],
			buildings: ['Forge'],
		});
		expect(buildSessionMetadataMock).toHaveBeenCalledTimes(1);
	});
});
