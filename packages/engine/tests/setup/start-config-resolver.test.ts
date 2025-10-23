import { describe, expect, it } from 'vitest';
import type { StartConfig } from '@kingdom-builder/protocol';
import { resolveStartConfigForMode } from '../../src/setup/start_config_resolver';

function createBaseConfig(): StartConfig {
	return {
		player: {
			resources: { gold: 5, stone: 2 },
			stats: { morale: 1 },
			population: { citizen: 1 },
			lands: [
				{
					id: 'base-land',
					slotsMax: 3,
					slotsUsed: 1,
				},
			],
		},
	};
}

describe('resolveStartConfigForMode', () => {
	it('returns a structured clone when developer mode is disabled', () => {
		const baseConfig = createBaseConfig();
		const resolved = resolveStartConfigForMode(baseConfig, false);

		expect(resolved).toEqual(baseConfig);
		expect(resolved).not.toBe(baseConfig);
		expect(resolved.player).not.toBe(baseConfig.player);
		expect(resolved.player?.lands).not.toBe(baseConfig.player?.lands);
	});

	it('returns a structured clone when developer overrides are not provided', () => {
		const baseConfig: StartConfig = {
			...createBaseConfig(),
			modes: {},
		};

		const resolved = resolveStartConfigForMode(baseConfig, true);

		expect(resolved).toEqual(baseConfig);
		expect(resolved).not.toBe(baseConfig);
		expect(resolved.player).not.toBe(baseConfig.player);
	});

	it('merges developer overrides into the base configuration', () => {
		const goldOverride = undefined as unknown as number;
		const baseConfig: StartConfig = {
			...createBaseConfig(),
			players: {
				alpha: {
					resources: { gold: 3 },
				},
			},
			modes: {
				dev: {
					player: {
						resources: {
							gold: goldOverride,
							wood: 4,
						},
						stats: { morale: 2 },
						population: {
							citizen: 0,
							worker: 2,
						},
						lands: [
							{
								id: 'dev-land',
								slotsMax: 2,
								slotsUsed: 0,
							},
						],
					},
					players: {
						alpha: {
							stats: { morale: 5 },
						},
						beta: {
							population: {
								worker: 3,
							},
						},
					},
				},
			},
		};

		const resolved = resolveStartConfigForMode(baseConfig, true);

		expect(resolved.player?.resources).toEqual({
			gold: 0,
			stone: 2,
			wood: 4,
		});
		expect(resolved.player?.stats).toEqual({ morale: 2 });
		expect(resolved.player?.population).toEqual({
			citizen: 0,
			worker: 2,
		});
		expect(resolved.player?.lands).toEqual([
			{
				id: 'dev-land',
				slotsMax: 2,
				slotsUsed: 0,
			},
		]);
		expect(resolved.player?.lands).not.toBe(baseConfig.player?.lands);
		expect(resolved.players?.alpha).toEqual({
			resources: { gold: 3 },
			stats: { morale: 5 },
		});
		expect(resolved.players?.beta).toEqual({
			population: { worker: 3 },
		});

		expect(baseConfig.player?.resources).toEqual({
			gold: 5,
			stone: 2,
		});
		expect(baseConfig.player?.lands).toEqual([
			{
				id: 'base-land',
				slotsMax: 3,
				slotsUsed: 1,
			},
		]);
		expect(baseConfig.players?.alpha).toEqual({
			resources: { gold: 3 },
		});
	});

	it('preserves base player lands when overrides omit them and initialises missing players', () => {
		const baseConfig: StartConfig = {
			player: {
				resources: { gold: 5 },
				lands: [
					{
						id: 'starter-land',
						slotsMax: 2,
						slotsUsed: 1,
					},
				],
			},
			modes: {
				dev: {
					player: {
						resources: { wood: 2 },
					},
					players: {
						gamma: {
							stats: { morale: 1 },
						},
					},
				},
			},
		};

		const resolved = resolveStartConfigForMode(baseConfig, true);

		expect(resolved.player?.resources).toEqual({
			gold: 5,
			wood: 2,
		});
		expect(resolved.player?.lands).toEqual(baseConfig.player.lands);
		expect(resolved.player?.lands).not.toBe(baseConfig.player.lands);
		expect(resolved.player).not.toHaveProperty('stats');
		expect(resolved.player).not.toHaveProperty('population');
		expect(resolved.players?.gamma).toEqual({
			stats: { morale: 1 },
		});
	});
});
