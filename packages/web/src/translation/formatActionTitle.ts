import type { ActionConfig } from '@kingdom-builder/protocol';
import type { TranslationContext } from './context';

type ActionTitleDefinition = Pick<ActionConfig, 'id' | 'name' | 'icon'> & {
	category?: string | undefined;
};

interface FormatActionTitleOptions {
	includePrefix?: boolean;
}

function combineIconLabel(icon: unknown, label: unknown): string {
	const parts: string[] = [];
	if (typeof icon === 'string') {
		const trimmedIcon = icon.trim();
		if (trimmedIcon.length > 0) {
			parts.push(trimmedIcon);
		}
	}
	if (typeof label === 'string') {
		const trimmedLabel = label.trim();
		if (trimmedLabel.length > 0) {
			parts.push(trimmedLabel);
		}
	}
	return parts.join(' ').trim();
}

function resolveCategoryLabel(
	definition: ActionTitleDefinition,
	context: TranslationContext,
): string | undefined {
	const categoryId =
		typeof definition.category === 'string' ? definition.category.trim() : '';
	if (!categoryId) {
		return undefined;
	}
	if (!context.actionCategories.has(categoryId)) {
		return undefined;
	}
	const category = context.actionCategories.get(categoryId);
	return combineIconLabel(category.icon, category.title);
}

function resolveActionLabel(definition: ActionTitleDefinition): string {
	const combined = combineIconLabel(definition.icon, definition.name);
	if (combined.length > 0) {
		return combined;
	}
	if (
		typeof definition.name === 'string' &&
		definition.name.trim().length > 0
	) {
		return definition.name.trim();
	}
	if (typeof definition.id === 'string' && definition.id.trim().length > 0) {
		return definition.id.trim();
	}
	return 'Unknown action';
}

function formatActionTitle(
	definition: ActionTitleDefinition,
	context: TranslationContext,
	options?: FormatActionTitleOptions,
): string {
	const includePrefix = options?.includePrefix ?? true;
	const parts: string[] = [];
	if (includePrefix) {
		parts.push('Action');
	}
	const categoryLabel = resolveCategoryLabel(definition, context);
	if (categoryLabel) {
		parts.push(categoryLabel);
	}
	const actionLabel = resolveActionLabel(definition);
	parts.push(actionLabel);
	return parts.join(' - ').replace(/\s+/g, ' ').trim();
}

export { formatActionTitle };
export type { ActionTitleDefinition, FormatActionTitleOptions };
