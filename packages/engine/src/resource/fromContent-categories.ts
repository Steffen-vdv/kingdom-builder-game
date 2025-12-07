import type {
	RuntimeResourceBoundOfConfig,
	RuntimeResourceCategoryDefinition,
	RuntimeResourceCategoryItem,
} from './types';

import type {
	ContentBoundOfConfig,
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

export function normalizeBoundOf(
	config: ContentBoundOfConfig | undefined,
	context: string,
): RuntimeResourceBoundOfConfig | null {
	if (!config) {
		return null;
	}
	if (!config.resourceId) {
		throw new Error(
			`${RUNTIME_PREFIX} ${context} boundOf requires a non-empty resourceId.`,
		);
	}
	if (config.boundType !== 'upper' && config.boundType !== 'lower') {
		throw new Error(
			`${RUNTIME_PREFIX} ${context} boundOf requires boundType ` +
				`to be 'upper' or 'lower' but received "${String(config.boundType)}".`,
		);
	}
	return Object.freeze({
		resourceId: config.resourceId,
		boundType: config.boundType,
	});
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
