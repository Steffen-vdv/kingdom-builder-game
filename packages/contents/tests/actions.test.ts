import { describe, expect, it } from 'vitest';
import { ACTIONS, ActionId } from '../src/actions';
import { ACTION_CATEGORIES, ActionCategoryId } from '../src/actionCategories';
import { OVERVIEW_CONTENT } from '../src/overview';

describe('actions registry', () => {
	it('registers renamed build, develop, and recruit commands', () => {
		const constructBuilding = ACTIONS.get(ActionId.construct_building);
		expect(constructBuilding?.name).toBe('Construct Building');

		const installDevelopment = ACTIONS.get(ActionId.install_development);
		expect(installDevelopment?.name).toBe('Install Development');

		const recruitPopulation = ACTIONS.get(ActionId.recruit_population);
		expect(recruitPopulation?.name).toBe('Recruit Population');
	});

	it('does not register category identifiers as standalone actions', () => {
		const actionIds = new Set(ACTIONS.keys());
		const categories = [
			ActionCategoryId.Basic,
			ActionCategoryId.Build,
			ActionCategoryId.Develop,
			ActionCategoryId.Hire,
		];

		for (const category of categories) {
			const categoryDefinition = ACTION_CATEGORIES.get(category);
			expect(categoryDefinition).toBeDefined();
			expect(actionIds.has(category)).toBe(false);
		}
	});

	it('exposes renamed action tokens in overview content', () => {
		const heroActions = OVERVIEW_CONTENT.hero.tokens?.actions ?? {};
		expect(heroActions[ActionId.construct_building]).toEqual([
			ActionId.construct_building,
		]);
		expect(heroActions[ActionId.install_development]).toEqual([
			ActionId.install_development,
		]);
		expect(heroActions[ActionId.recruit_population]).toEqual([
			ActionId.recruit_population,
		]);
	});
});
