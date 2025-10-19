import { Registry } from '@kingdom-builder/protocol';
import { actionCategory, type ActionCategoryConfig } from './config/builders';

const ACTION_CATEGORY_ID_MAP = {
	Basic: 'basic',
	Hire: 'hire',
	Develop: 'develop',
	Build: 'build',
} as const;

export const ActionCategoryId = ACTION_CATEGORY_ID_MAP;

export type ActionCategoryId =
	(typeof ActionCategoryId)[keyof typeof ActionCategoryId];

export function createActionCategoryRegistry() {
	const registry = new Registry<ActionCategoryConfig>();

	const categories = [
		actionCategory()
			.id(ActionCategoryId.Basic)
			.label('Basic')
			.subtitle('Core Commands')
			.icon('icon-action-basic')
			.order(0)
			.layout('grid-primary')
			.description('Default castle commands available every turn.')
			.build(),
		actionCategory()
			.id(ActionCategoryId.Hire)
			.label('Hire')
			.subtitle('Recruit Citizens')
			.icon('icon-action-hire')
			.order(1)
			.layout('grid-primary')
			.description('Actions that add population or assign roles.')
			.build(),
		actionCategory()
			.id(ActionCategoryId.Develop)
			.label('Develop')
			.subtitle('Improve Holdings')
			.icon('icon-action-dev')
			.order(2)
			.layout('grid-secondary')
			.description('Developments that upgrade existing buildings or lands.')
			.build(),
		actionCategory()
			.id(ActionCategoryId.Build)
			.label('Build')
			.subtitle('Expand Territory')
			.icon('icon-action-build')
			.order(3)
			.layout('grid-secondary')
			.description('Construction options that add new structures or unlocks.')
			.build(),
	];

	categories.forEach((category) => {
		registry.add(category.id, category);
	});

	return registry;
}

export const ACTION_CATEGORIES = createActionCategoryRegistry();
