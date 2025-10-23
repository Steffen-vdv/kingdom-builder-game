import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionRuntimeConfigResponse } from '@kingdom-builder/protocol';
import type { RuntimeContentConfig } from '../../src/startup/runtimeConfig';

const runtimeModulePath = '../../src/startup/runtimeConfig';
const globalScope = globalThis as {
	__KINGDOM_BUILDER_CONFIG__?: Partial<RuntimeContentConfig> | undefined;
};

const baseResponse: SessionRuntimeConfigResponse = {
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
	resources: {
		gold: { key: 'gold', icon: 'gold-icon' },
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
		payload: SessionRuntimeConfigResponse = baseResponse,
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
		expect(config.resources.gold).toEqual(baseResponse.resources.gold);
		expect(config.resourcesV2).toEqual({});
		expect(config.resourceGroups).toEqual({});
	});

	it('applies runtime overrides from the global scope', async () => {
		mockSuccessfulFetch();
		globalScope.__KINGDOM_BUILDER_CONFIG__ = {
			primaryIconId: 'custom-primary',
			resources: {
				gold: { key: 'gold', icon: 'override-icon' },
				extra: { key: 'extra' },
			},
			resourcesV2: {
				gold: { id: 'gold', name: 'Gold', order: 0, isPercent: false },
			},
			resourceGroups: {
				wealth: {
					id: 'wealth',
					name: 'Wealth',
					order: 1,
					children: ['gold'],
				},
			},
		};
		const { getRuntimeContentConfig } = await import(runtimeModulePath);
		const config = await getRuntimeContentConfig();
		expect(config.primaryIconId).toBe('custom-primary');
		expect(config.resources.extra).toEqual({ key: 'extra' });
		expect(config.resources.gold?.icon).toBe('override-icon');
		expect(config.resourcesV2.gold).toEqual({
			id: 'gold',
			name: 'Gold',
			order: 0,
			isPercent: false,
		});
		expect(config.resourceGroups.wealth).toEqual({
			id: 'wealth',
			name: 'Wealth',
			order: 1,
			children: ['gold'],
		});
	});

	it('merges server-provided resourceV2 registries', async () => {
		mockSuccessfulFetch({
			...baseResponse,
			resourcesV2: {
				gold: { id: 'gold', name: 'Gold', order: 0, isPercent: false },
			},
			resourceGroups: {
				wealth: {
					id: 'wealth',
					name: 'Wealth',
					order: 1,
					children: ['gold'],
				},
			},
		});
		const { getRuntimeContentConfig } = await import(runtimeModulePath);
		const config = await getRuntimeContentConfig();
		expect(config.resourcesV2.gold).toEqual({
			id: 'gold',
			name: 'Gold',
			order: 0,
			isPercent: false,
		});
		expect(config.resourceGroups.wealth).toEqual({
			id: 'wealth',
			name: 'Wealth',
			order: 1,
			children: ['gold'],
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
