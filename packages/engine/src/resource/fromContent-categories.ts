import type {
	RuntimeResourceCategoryDefinition,
	RuntimeResourceCategoryItem,
} from './types';

import type {
	ContentCategoryDefinition,
	ContentCategoryItem,
} from './content-types';

const RUNTIME_PREFIX = 'Resource runtime';

type NumericField = 'order';

function assertInteger(
	value: number,
	field: NumericField,
	context: string,
): void {
	if (!Number.isInteger(value)) {
		throw new Error(
			`${RUNTIME_PREFIX} expected ${context} ${field} to be an integer ` +
				`but received ${value}.`,
		);
	}
}

function normalizeCategoryItem(
	item: ContentCategoryItem,
): RuntimeResourceCategoryItem {
	return Object.freeze({ ...item });
}

export function normalizeCategory(
	definition: ContentCategoryDefinition,
	index: number,
): RuntimeResourceCategoryDefinition {
	const context = `category "${definition.id}"`;
	const { order } = definition;
	if (typeof order === 'number') {
		assertInteger(order, 'order', context);
	}
	const contents = definition.contents.map(normalizeCategoryItem);
	return Object.freeze({
		id: definition.id,
		label: definition.label,
		icon: definition.icon ?? null,
		description: definition.description ?? null,
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : index,
		isPrimary: definition.isPrimary === true,
		contents: Object.freeze([...contents]),
	});
}
