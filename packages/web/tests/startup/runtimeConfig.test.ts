import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LegacyContentConfig } from '../../src/startup/runtimeConfig';
import fallbackConfigJson from '../../src/startup/runtimeConfigFallback.json';

const runtimeModulePath = '../../src/startup/runtimeConfig';
const fallbackConfig = fallbackConfigJson as LegacyContentConfig;
const globalScope = globalThis as {
	__KINGDOM_BUILDER_CONFIG__?: Partial<LegacyContentConfig> | undefined;
};

function resetRuntimeOverrides(): void {
	delete globalScope.__KINGDOM_BUILDER_CONFIG__;
}

describe('getLegacyContentConfig', () => {
	beforeEach(() => {
		resetRuntimeOverrides();
		vi.resetModules();
	});

	afterEach(() => {
		resetRuntimeOverrides();
	});

	it('returns the static fallback snapshot when no runtime overrides exist', async () => {
		const { getLegacyContentConfig } = await import(runtimeModulePath);
		const config = await getLegacyContentConfig();
		expect(config).toEqual(fallbackConfig);
		expect(config).not.toBe(fallbackConfig);
		expect(config.resources).not.toBe(fallbackConfig.resources);
	});

	it('merges runtime overrides on top of the fallback snapshot', async () => {
		const [firstResourceKey] = Object.keys(fallbackConfig.resources);
		if (!firstResourceKey) {
			throw new Error('Fallback resources are empty.');
		}
		const fallbackResource = fallbackConfig.resources[firstResourceKey];
		if (!fallbackResource) {
			throw new Error('Missing fallback resource definition.');
		}
		globalScope.__KINGDOM_BUILDER_CONFIG__ = {
			primaryIconId: 'custom-primary',
			resources: {
				[firstResourceKey]: { ...fallbackResource },
				extra: { key: 'extra', icon: '✨' },
			},
		};
		const { getLegacyContentConfig } = await import(runtimeModulePath);
		const config = await getLegacyContentConfig();
		expect(config.primaryIconId).toBe('custom-primary');
		expect(config.resources.extra).toEqual({ key: 'extra', icon: '✨' });
		expect(config.resources[firstResourceKey]).toEqual(
			expect.objectContaining({ key: firstResourceKey }),
		);
	});
});
