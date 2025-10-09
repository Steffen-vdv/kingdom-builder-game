import { describe, it, expect } from 'vitest';
import { Services } from '../../src/services';
import { PlayerState, Land } from '../../src/state';
import { RULES } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';

describe('PopcapService', () => {
	it('calculates population cap from houses on land', () => {
		const content = createContentFactory();
		const house = content.development({ populationCap: 1 });
		const services = new Services(RULES, content.developments);
		const player = new PlayerState('A', 'Test');
		const land1 = new Land('l1', 1);
		land1.developments.push(house.id);
		const land2 = new Land('l2', 2);
		land2.developments.push(house.id, house.id);
		player.lands = [land1, land2];
		const cap = services.popcap.getCap(player);
		const houseCap = house.populationCap || 0;
		const baseCap = RULES.basePopulationCap;
		expect(cap).toBe(baseCap + houseCap * 3);
	});
});
