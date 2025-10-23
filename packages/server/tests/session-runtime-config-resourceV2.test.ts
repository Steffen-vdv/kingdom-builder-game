import { describe, expect, it } from 'vitest';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

describe('session runtime config resourceV2 payload', () => {
	it('includes resourceV2 definitions and groups when available', () => {
		const { manager } = createSyntheticSessionManager();
		const runtimeConfig = manager.getRuntimeConfig();
		const registries = manager.getRegistries();
		expect(registries.resourcesV2).toBeDefined();
		expect(runtimeConfig.resourcesV2).toBeDefined();
		expect(runtimeConfig.resourcesV2).toEqual(registries.resourcesV2);
		expect(registries.resourceGroups).toBeDefined();
		expect(runtimeConfig.resourceGroups).toBeDefined();
		expect(runtimeConfig.resourceGroups).toEqual(registries.resourceGroups);
	});

	it('omits resourceV2 registries when none are configured', () => {
		const { manager } = createSyntheticSessionManager({
			engineOptions: {
				resourcesV2: {},
				resourceGroups: {},
			},
		});
		const runtimeConfig = manager.getRuntimeConfig();
		expect(runtimeConfig.resourcesV2).toBeUndefined();
		expect(runtimeConfig.resourceGroups).toBeUndefined();
	});
});
