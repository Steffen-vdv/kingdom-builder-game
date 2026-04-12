import { Registry } from '@kingdom-builder/protocol';
import { actionCategory, type ActionCategoryConfig } from '../../infrastructure/builders';

const ACTION_CATEGORY_ID_MAP = {
	Basic: 'basic',
	Hire: 'hire',
	Build: 'build',
} as const;

const ACTION_CATEGORY_ICONS = {
	Basic: '⚙️',
	Hire: '🧑‍🤝‍🧑',
	Build: '🏗️',
} as const;

export const ActionCategoryId = ACTION_CATEGORY_ID_MAP;

export type ActionCategoryId = (typeof ActionCategoryId)[keyof typeof ActionCategoryId];

export function createActionCategoryRegistry() {
	const registry = new Registry<ActionCategoryConfig>();

	const categories = [
		actionCategory().id(ActionCategoryId.Basic).label('Basic').icon(ACTION_CATEGORY_ICONS.Basic).order(0).layout('grid-primary').description('Default castle commands available every turn.').build(),
		actionCategory().id(ActionCategoryId.Hire).label('Hire').icon(ACTION_CATEGORY_ICONS.Hire).order(1).layout('grid-primary').description('Actions that add population or assign roles.').build(),
		actionCategory()
			.id(ActionCategoryId.Build)
			.label('Build')
			.icon(ACTION_CATEGORY_ICONS.Build)
			.order(2)
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
