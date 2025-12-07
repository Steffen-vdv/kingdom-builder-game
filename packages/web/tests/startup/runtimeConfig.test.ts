import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeContentConfig } from '../../src/startup/runtimeConfig';

const runtimeModulePath = '../../src/startup/runtimeConfig';
const globalScope = globalThis as {
	__KINGDOM_BUILDER_CONFIG__?: Partial<RuntimeContentConfig> | undefined;
};

const baseResource = {
	id: 'resource:core:gold',
	label: 'Gold',
	icon: '💰',
	description: 'Gold resource',
	order: 0,
	tags: [],
	displayAsPercent: false,
	trackValueBreakdown: false,
	trackBoundBreakdown: false,
	groupId: 'resource-group:core',
	groupOrder: 0,
} as const;

const baseResourceGroup = {
	id: 'resource-group:core',
	order: 0,
	parent: {
		id: 'resource-group:core',
		label: 'Core Resources',
		icon: '🏰',
		description: 'Core resources',
		order: 0,
		tags: [],
		displayAsPercent: false,
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
	},
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
	resources: {
		gold: { key: 'gold', icon: 'gold-icon' },
	},
	resources: {
		'resource:core:gold': baseResource,
	},
	resourceGroups: {
		'resource-group:core': baseResourceGroup,
	},
	resourceCategories: {},
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
		expect(config.resources.gold).toEqual(baseResponse.resources.gold);
	});

	it('applies runtime overrides from the global scope', async () => {
		mockSuccessfulFetch();
		globalScope.__KINGDOM_BUILDER_CONFIG__ = {
			primaryIconId: 'custom-primary',
			resources: {
				gold: { key: 'gold', icon: 'override-icon' },
				extra: { key: 'extra' },
			},
		};
		const { getRuntimeContentConfig } = await import(runtimeModulePath);
		const config = await getRuntimeContentConfig();
		expect(config.primaryIconId).toBe('custom-primary');
		expect(config.resources.extra).toEqual({ key: 'extra' });
		expect(config.resources.gold?.icon).toBe('override-icon');
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
