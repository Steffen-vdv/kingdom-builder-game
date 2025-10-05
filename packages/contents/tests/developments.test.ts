import { describe, expect, it } from 'vitest';
import { createDevelopmentRegistry, DevelopmentId } from '../src/developments';

describe('developments registry', () => {
	it('uses DevelopmentId constants as registry keys', () => {
		const registry = createDevelopmentRegistry();
		const registryKeys = registry.keys().slice().sort();
		const developmentIds = Object.values(DevelopmentId).slice().sort();

		expect(registryKeys).toEqual(developmentIds);
	});
});
