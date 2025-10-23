import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeContentConfig } from '../../src/startup/runtimeConfig';

const runtimeModulePath = '../../src/startup/runtimeConfig';
const globalScope = globalThis as {
	__KINGDOM_BUILDER_CONFIG__?: Partial<RuntimeContentConfig> | undefined;
};

const wealthParent = {
	id: 'wealth',
	icon: '🏦',
	label: 'Wealth',
	description: 'Wealth resources.',
	order: 0,
	limited: true,
} as const;

const baseResponse = {
	phases: [
		{
			id: 'phase:main',
			steps: [{ id: 'step:main' }],
		},
	],
	start: {
		player: {
			resources: { gold: 10 },
			stats: {},
			population: {},
			lands: [],
		},
	},
	rules: {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'down',
		tieredResourceKey: 'gold',
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: [],
	},
	resourceValues: {
		definitions: {
			gold: {
				id: 'gold',
				display: {
					icon: '🪙',
					label: 'Gold',
					description: 'Spendable gold coins.',
					order: 0,
				},
				bounds: { lowerBound: 0 },
			},
		},
		groups: {
			wealth: {
				id: 'wealth',
				parent: wealthParent,
			},
		},
		globalActionCost: {
			resourceId: 'gold',
			amount: 1,
		},
	},
	primaryIconId: 'gold',
} as const;

describe('getRuntimeContentConfig', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	function resetRuntimeOverrides(): void {
		delete globalScope.__KINGDOM_BUILDER_CONFIG__;
	}

	beforeEach(() => {
		resetRuntimeOverrides();
		vi.resetModules();
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		resetRuntimeOverrides();
		vi.unstubAllGlobals();
	});

	function mockSuccessfulFetch(
		payload: typeof baseResponse = baseResponse,
	): void {
		fetchMock.mockResolvedValue({
			ok: true,
			status: 200,
			json: vi.fn().mockResolvedValue(payload),
		});
	}

	it('fetches runtime configuration from the server', async () => {
		mockSuccessfulFetch();
		const { getRuntimeContentConfig } = await import(runtimeModulePath);
		const config = await getRuntimeContentConfig();
		expect(fetchMock).toHaveBeenCalledWith('/runtime-config', {
			credentials: 'same-origin',
		});
		expect(config.phases).toEqual(baseResponse.phases);
		expect(config.phases).not.toBe(baseResponse.phases);
		expect(config.resourceValues).toEqual(baseResponse.resourceValues);
		expect(config.resourceValues).not.toBe(baseResponse.resourceValues);
		expect(config.resourceValues.definitions.gold).toEqual(
			baseResponse.resourceValues.definitions.gold,
		);
		expect(config.resourceValues.definitions.gold).not.toBe(
			baseResponse.resourceValues.definitions.gold,
		);
	});

	it('applies runtime overrides from the global scope', async () => {
		mockSuccessfulFetch();
		globalScope.__KINGDOM_BUILDER_CONFIG__ = {
			primaryIconId: 'custom-primary',
			resourceValues: {
				definitions: {
					gold: {
						id: 'gold',
						display: {
							icon: '💰',
							label: 'Gold',
							description: 'Spendable gold coins.',
							order: 0,
						},
						bounds: { lowerBound: 0 },
					},
					crystal: {
						id: 'crystal',
						display: {
							icon: '💎',
							label: 'Crystal',
							description: 'Premium resource.',
							order: 1,
						},
					},
				},
				groups: {
					wealth: {
						id: 'wealth',
						parent: wealthParent,
					},
				},
				globalActionCost: {
					resourceId: 'crystal',
					amount: 4,
				},
			},
		};
		const { getRuntimeContentConfig } = await import(runtimeModulePath);
		const config = await getRuntimeContentConfig();
		expect(config.primaryIconId).toBe('custom-primary');
		expect(config.resourceValues.globalActionCost).toEqual({
			resourceId: 'crystal',
			amount: 4,
		});
		expect(config.resourceValues.definitions.gold.display.icon).toBe('💰');
		expect(config.resourceValues.definitions.crystal).toEqual({
			id: 'crystal',
			display: {
				icon: '💎',
				label: 'Crystal',
				description: 'Premium resource.',
				order: 1,
			},
		});
	});

	it('throws when the runtime configuration request fails', async () => {
		fetchMock.mockRejectedValue(new Error('network-error'));
		const { getRuntimeContentConfig } = await import(runtimeModulePath);
		await expect(getRuntimeContentConfig()).rejects.toThrow(
			'Failed to request runtime configuration.',
		);
	});

	it('throws when the runtime configuration response is not ok', async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 500,
			json: vi.fn(),
		});
		const { getRuntimeContentConfig } = await import(runtimeModulePath);
		await expect(getRuntimeContentConfig()).rejects.toThrow(
			'Runtime configuration request failed with status 500.',
		);
	});
});
