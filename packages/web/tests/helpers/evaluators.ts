export const compareRequirement = (left: unknown, right: unknown) => ({
	type: 'evaluator',
	method: 'compare',
	params: { left, operator: 'lt', right },
});

/**
 * Creates a resource evaluator definition.
 * For population totals, use without resourceId or pass total population ID.
 * For specific roles, pass the role's resource ID.
 */
export const resourceEvaluator = (resourceId?: string) => ({
	type: 'resource',
	params: resourceId ? { resourceId } : {},
});
