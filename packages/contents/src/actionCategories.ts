import {
	Registry,
	actionCategorySchema,
	type ActionCategoryConfig,
} from '@kingdom-builder/protocol';

const ACTION_CATEGORY_ID = {
	Basic: 'basic',
	Population: 'population',
	Development: 'development',
	Building: 'building',
} as const;

export const ActionCategoryId = ACTION_CATEGORY_ID;

export type ActionCategoryId =
	(typeof ACTION_CATEGORY_ID)[keyof typeof ACTION_CATEGORY_ID];

export type ActionCategoryDef = ActionCategoryConfig;

export function createActionCategoryRegistry() {
	const registry = new Registry<ActionCategoryDef>(actionCategorySchema);
	registry.add(ActionCategoryId.Basic, {
		id: ActionCategoryId.Basic,
		name: 'Basic',
		icon: '⚙️',
		order: 1,
		description: '(Effects take place immediately, unless stated otherwise)',
	});
	registry.add(ActionCategoryId.Population, {
		id: ActionCategoryId.Population,
		name: 'Hire',
		icon: '👶',
		order: 2,
		description:
			'(Recruit population instantly; upkeep and role effects apply ' +
			'while they remain)',
	});
	registry.add(ActionCategoryId.Development, {
		id: ActionCategoryId.Development,
		name: 'Develop',
		icon: '🏗️',
		order: 3,
		description:
			'(Effects take place on build and last until development is ' +
			'removed)',
	});
	registry.add(ActionCategoryId.Building, {
		id: ActionCategoryId.Building,
		name: 'Build',
		icon: '🏛️',
		order: 4,
		description:
			'(Effects take place on build and last until building is ' + 'removed)',
	});
	return registry;
}

export const ACTION_CATEGORIES = createActionCategoryRegistry();
