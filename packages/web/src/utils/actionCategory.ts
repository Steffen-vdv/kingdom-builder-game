export interface MaybeActionCategory {
	category?: unknown;
	[key: string]: unknown;
}

export function getActionCategoryId(
	definition: MaybeActionCategory | undefined,
): string | undefined {
	const category = definition?.category;
	return typeof category === 'string' ? category : undefined;
}
