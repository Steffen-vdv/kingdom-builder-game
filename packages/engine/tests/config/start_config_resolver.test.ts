import { describe, expect, it } from 'vitest';
import type { StartConfig } from '@kingdom-builder/protocol';
import { resolveStartConfigForMode } from '../../src/setup/start_config_resolver.js';

function createBaseConfig(): StartConfig {
	return {
		player: {
			resources: { gold: 10 },
			stats: { morale: 1 },
			population: { council: 1 },
			lands: [{ slotsMax: 2 }],
		},
		players: {
			alpha: {
				resources: { gold: 3 },
				population: { council: 1 },
				lands: [{ slotsMax: 1 }],
			},
		},
	};
}

describe('resolveStartConfigForMode', () => {
	it('returns a cloned base configuration when dev mode is disabled', () => {
		const base = createBaseConfig();
		const result = resolveStartConfigForMode(base, false);
		expect(result).not.toBe(base);
		expect(result).toEqual(base);
		expect(result.player.resources).toBeDefined();
		if (result.player.resources) {
			result.player.resources.gold = 20;
		}
		expect(base.player.resources?.gold).toBe(10);
	});

	it('merges dev overrides for the shared player configuration and individual players', () => {
		const base = createBaseConfig();
		const result = resolveStartConfigForMode(
			{
				...base,
				modes: {
					dev: {
						player: {
							resources: { gold: 25, silver: undefined } as unknown as Record<
								string,
								number
							>,
							stats: { morale: 5 },
							population: {
								citizen: 2,
								council: undefined,
							} as unknown as Record<string, number>,
							lands: [{ slotsMax: 4 }],
						},
						players: {
							alpha: {
								stats: { morale: 3 },
							},
							beta: {
								resources: { gold: 7 },
								lands: [{ slotsMax: 2 }],
							},
						},
					},
				},
			},
			true,
		);

		expect(result.player.resources?.gold).toBe(25);
		expect(result.player.resources?.silver).toBe(0);
		expect(result.player.population?.citizen).toBe(2);
		expect(result.player.population?.council).toBe(0);
		expect(result.player.lands).toEqual([{ slotsMax: 4 }]);
		expect(base.player.lands).toEqual([{ slotsMax: 2 }]);

		expect(result.players?.alpha?.resources?.gold).toBe(3);
		expect(result.players?.alpha?.stats?.morale).toBe(3);
		expect(result.players?.alpha?.lands).toEqual([{ slotsMax: 1 }]);

		expect(result.players?.beta?.resources?.gold).toBe(7);
		expect(result.players?.beta?.lands).toEqual([{ slotsMax: 2 }]);
		expect(base.players?.beta).toBeUndefined();
	});
});
