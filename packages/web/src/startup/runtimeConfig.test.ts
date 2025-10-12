import { afterEach, describe, expect, it, vi } from 'vitest';
import fallbackLegacyContent from './legacyContentFallback.json';

declare global {
	// eslint-disable-next-line no-var
	var __KINGDOM_BUILDER_CONFIG__: unknown;
}

afterEach(() => {
	delete globalThis.__KINGDOM_BUILDER_CONFIG__;
	vi.resetModules();
});

describe('getLegacyContentConfig', () => {
	it('returns the static fallback snapshot when no runtime config is provided', async () => {
		const { getLegacyContentConfig } = await import('./runtimeConfig');
		const config = await getLegacyContentConfig();
		expect(config.phases).toEqual(fallbackLegacyContent.phases);
		expect(config.start).toEqual(fallbackLegacyContent.start);
		expect(config.rules).toEqual(fallbackLegacyContent.rules);
		expect(config.primaryIconId).toBe(
			fallbackLegacyContent.primaryIconId ?? null,
		);
		expect(config.resources).toEqual(fallbackLegacyContent.resources);
		expect(config.developerPreset).toEqual(
			fallbackLegacyContent.developerPreset,
		);
	});

	it('merges runtime overrides with the fallback snapshot', async () => {
		globalThis.__KINGDOM_BUILDER_CONFIG__ = {
			primaryIconId: 'custom-icon',
			resources: {
				gold: { key: 'gold', icon: '💎' },
			},
		} satisfies Parameters<typeof Object.assign>[0];
		const { getLegacyContentConfig } = await import('./runtimeConfig');
		const config = await getLegacyContentConfig();
		expect(config.primaryIconId).toBe('custom-icon');
		expect(config.resources.gold).toEqual({
			key: 'gold',
			icon: '💎',
		});
		expect(config.start).toEqual(fallbackLegacyContent.start);
	});
});
