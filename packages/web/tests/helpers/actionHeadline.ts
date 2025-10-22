import type { TranslationContext } from '../../src/translation/context';
import { formatActionHeadline } from '../../src/utils/formatActionHeadline';
import {
	extractActionCategoryId,
	resolveActionCategoryDefinition,
} from '../../src/utils/resolveActionCategory';

interface ActionLike {
	id: string;
	icon?: string | undefined;
	name?: string | undefined;
}

export function resolveActionHeadline(
	translation: TranslationContext,
	action: ActionLike,
): string {
	const definition = translation.actions.get(action.id);
	const icon =
		typeof definition?.icon === 'string'
			? definition.icon.trim()
			: action.icon?.trim();
	const name =
		typeof definition?.name === 'string' ? definition.name.trim() : action.name;
	const categoryId = extractActionCategoryId(definition);
	const category = resolveActionCategoryDefinition(
		translation.actionCategories,
		categoryId,
	);
	return formatActionHeadline({
		actionTitle: name ?? action.id,
		...(icon ? { actionIcon: icon } : {}),
		...(category?.icon ? { categoryIcon: category.icon } : {}),
		...(category?.title ? { categoryTitle: category.title } : {}),
	});
}
