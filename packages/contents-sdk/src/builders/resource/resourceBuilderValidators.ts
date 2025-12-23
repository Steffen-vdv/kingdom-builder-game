import type { ResourceBoundValue } from './types';

const builderName = 'Resource builder';

export type NumericField =
	| 'order'
	| 'lowerBound'
	| 'upperBound'
	| 'groupOrder'
	| 'globalCost.amount';

export function assertInteger(value: number, field: NumericField) {
	if (!Number.isInteger(value)) {
		throw new Error(
			`${builderName} expected ${field} to be an integer but received ${value}.`,
		);
	}
}

export function assertValidBoundValue(
	value: ResourceBoundValue,
	field: NumericField,
) {
	if (typeof value === 'number') {
		assertInteger(value, field);
		return;
	}
	// It's a ResourceBoundReference
	if (!value.resourceId) {
		throw new Error(
			`${builderName} ${field}() requires a non-empty resourceId.`,
		);
	}
}

export function assertPositiveInteger(value: number, field: NumericField) {
	assertInteger(value, field);
	if (value <= 0) {
		throw new Error(
			`${builderName} expected ${field} to be greater than 0 but received ${value}.`,
		);
	}
}
