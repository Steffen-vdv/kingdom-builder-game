import type { TranslationActionCategoryRegistry } from '../translation/context';

interface ActionCategoryCarrier {
	category?: unknown;
}

function isActionCategoryCarrier(
	value: unknown,
): value is ActionCategoryCarrier {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	return 'category' in value;
}

function normalizeCategoryValue(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function extractActionCategoryId(source: unknown): string | undefined {
	if (!isActionCategoryCarrier(source)) {
		return undefined;
	}
	const raw = source.category;
	if (typeof raw !== 'string') {
		return undefined;
	}
	return normalizeCategoryValue(raw);
}

interface ResolvedActionCategory {
	id: string;
	title?: string;
	icon?: string;
}

function resolveActionCategoryDefinition(
	registry: Pick<TranslationActionCategoryRegistry, 'has' | 'get'>,
	categoryId: string | undefined,
): ResolvedActionCategory | undefined {
	if (!categoryId) {
		return undefined;
	}
	if (!registry.has(categoryId)) {
		return { id: categoryId };
	}
	const category = registry.get(categoryId);
	const definition: ResolvedActionCategory = { id: category.id };
	const normalizedTitle = normalizeCategoryValue(category.title ?? '');
	if (normalizedTitle) {
		definition.title = normalizedTitle;
	}
	const normalizedIcon = normalizeCategoryValue(category.icon ?? '');
	if (normalizedIcon) {
		definition.icon = normalizedIcon;
	}
	return definition;
}

export { extractActionCategoryId, resolveActionCategoryDefinition };
export type { ResolvedActionCategory };
