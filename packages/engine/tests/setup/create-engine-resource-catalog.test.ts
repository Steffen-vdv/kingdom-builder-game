import { describe, it, expect } from 'vitest';
import { createTestEngine } from '../helpers.ts';

describe('createEngine ResourceV2 wiring', () => {
	it('attaches the runtime ResourceV2 catalog to the engine context and game state', () => {
		const context = createTestEngine();

		expect(context.resourceCatalogV2).toBeDefined();
		expect(context.game.resourceCatalogV2).toBe(context.resourceCatalogV2);
	});
});
