import { describe, it, expect } from 'vitest';
import type { StartConfig } from '@kingdom-builder/protocol';
import { resolveStartConfigForMode } from '../../src/setup/start_config_resolver.ts';

describe('resolveStartConfigForMode', () => {
	it('returns a cloned config when developer mode is disabled', () => {
		const base: StartConfig = {
			player: {
				resources: { gold: 10 },
				stats: { prosperity: 2 },
				population: { citizens: 3 },
				lands: [{ tilled: false }],
			},
		};
		const resolved = resolveStartConfigForMode(base, false);
		expect(resolved).toEqual(base);
		expect(resolved).not.toBe(base);
		resolved.player.resources!.gold = 99;
		expect(base.player.resources!.gold).toBe(10);
	});

	it('returns the base config when developer overrides are missing', () => {
		const base: StartConfig = {
			player: {
				resources: { gold: 7 },
			},
		};
		const resolved = resolveStartConfigForMode(base, true);
		expect(resolved).toEqual(base);
	});

	it('merges developer overrides into the base configuration', () => {
		const base: StartConfig = {
			player: {
				resources: { gold: 10, stone: 5 },
				stats: { prosperity: 1 },
				population: { citizens: 2 },
				lands: [{ tilled: false, slotsMax: 1 }],
			},
			players: {
				alpha: {
					resources: { ore: 1 },
					population: { citizens: 1 },
				},
			},
			modes: {
				dev: {
					player: {
						resources: {
							gold: 25,
							stone: undefined as unknown as number,
							food: 3,
						},
						stats: { prosperity: 0, culture: 4 },
						population: { citizens: 5 },
						lands: [{ tilled: true, slotsMax: 2 }],
					},
					players: {
						alpha: {
							resources: { ore: 4 },
							population: { citizens: 3, scouts: 1 },
						},
						beta: {
							resources: { ore: 2 },
							stats: { valor: 1 },
						},
					},
				},
			},
		};
		const resolved = resolveStartConfigForMode(base, true);
		expect(resolved.player.resources).toEqual({
			gold: 25,
			stone: 0,
			food: 3,
		});
		expect(resolved.player.stats).toEqual({ prosperity: 0, culture: 4 });
		expect(resolved.player.population).toEqual({ citizens: 5 });
		expect(resolved.player.lands).toEqual([{ tilled: true, slotsMax: 2 }]);
		expect(resolved.players?.alpha).toEqual({
			resources: { ore: 4 },
			population: { citizens: 3, scouts: 1 },
		});
		expect(resolved.players?.beta).toEqual({
			resources: { ore: 2 },
			stats: { valor: 1 },
		});
		expect(base.players?.alpha?.resources?.ore).toBe(1);
		expect(base.player.resources?.gold).toBe(10);
	});

	it('creates a players map when the base config omits one', () => {
		const base: StartConfig = {
			player: {
				resources: { gold: 5 },
			},
			modes: {
				dev: {
					players: {
						gamma: {
							resources: { ore: 7 },
						},
					},
				},
			},
		};
		const resolved = resolveStartConfigForMode(base, true);
		expect(resolved.players).toEqual({
			gamma: { resources: { ore: 7 } },
		});
	});
});
