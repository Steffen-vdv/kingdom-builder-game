import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../context';
import { selectSlotDisplay } from '../context/assetSelectors';

type EvaluatorOperand = {
	type?: string;
	params?: Record<string, unknown>;
};

type CompareOperand = number | EvaluatorOperand;

type CompareParams = {
	left?: CompareOperand;
	right?: CompareOperand;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
};

type OperandDescription = {
	icon?: string;
	label: string;
};

/**
 * Describes any resource-based evaluator operand using Resource metadata.
 * All resources (including what were formerly "stats" and "population")
 * use the unified Resource registry for labels and icons. Also checks
 * group metadata for aggregate resources like total population.
 */
function describeResourceOperand(
	params: Record<string, unknown> | undefined,
	context: TranslationContext,
): OperandDescription {
	const resourceId = params?.['resourceId'];
	if (typeof resourceId === 'string') {
		// Try resource metadata first, then fall back to group metadata
		const metadata = context.resourceMetadata.has(resourceId)
			? context.resourceMetadata.get(resourceId)
			: context.resourceGroupMetadata.get(resourceId);
		if (metadata.icon) {
			return { icon: metadata.icon, label: metadata.label };
		}
		return { label: metadata.label };
	}
	return { label: 'Value' };
}

function describeEvaluatorOperand(
	operand: CompareOperand | undefined,
	context: TranslationContext,
): OperandDescription {
	if (!operand || typeof operand === 'number') {
		return { label: 'Value' };
	}
	// Land evaluator has its own display
	if (operand.type === 'land') {
		const slot = selectSlotDisplay(context.assets);
		return {
			...(slot.icon && { icon: slot.icon }),
			label: slot.label || 'Land',
		};
	}
	// All resource evaluators use Resource metadata (returns 'Value' if no id)
	if (operand.type === 'resource') {
		return describeResourceOperand(operand.params, context);
	}
	return { label: 'Value' };
}

function isLandOperand(operand: CompareOperand | undefined): boolean {
	if (!operand || typeof operand === 'number') {
		return false;
	}
	return operand.type === 'land';
}

function describeLandRequirement(context: TranslationContext): string {
	const slot = selectSlotDisplay(context.assets);
	const parts = [slot.icon, slot.label].filter(Boolean);
	const detail = parts.join(' ').trim() || 'Development Slot';
	return `Must have at least one available ${detail}`;
}

function formatOperand(
	operand: CompareOperand | undefined,
	context: TranslationContext,
	actual: unknown,
): string {
	if (typeof operand === 'number') {
		return `${operand}`;
	}
	const { icon, label } = describeEvaluatorOperand(operand, context);
	const base = [icon, label].filter(Boolean).join(' ').trim() || 'Value';
	if (typeof actual === 'number') {
		return `${base} (${actual})`;
	}
	return base;
}

function operatorPhrase(operator: CompareParams['operator']): string {
	switch (operator) {
		case 'lt':
			return 'must be lower than';
		case 'lte':
			return 'must be at most';
		case 'gt':
			return 'must be greater than';
		case 'gte':
			return 'must be at least';
		case 'eq':
			return 'must be';
		case 'ne':
			return 'must not equal';
		default:
			return 'must satisfy';
	}
}

function translateCompareRequirement(
	failure: SessionRequirementFailure,
	context: TranslationContext,
): string {
	const params = (failure.requirement.params ?? {}) as CompareParams;
	const leftOperand = params.left;
	const rightOperand = params.right;
	// Special case for land availability check
	if (params.operator === 'gt' && isLandOperand(leftOperand)) {
		const rightNumber =
			typeof rightOperand === 'number' ? rightOperand : undefined;
		if (rightNumber === 0) {
			return describeLandRequirement(context);
		}
	}
	// Generic formatting using Resource metadata for labels
	const left = formatOperand(leftOperand, context, failure.details?.['left']);
	const right = formatOperand(
		rightOperand,
		context,
		failure.details?.['right'],
	);
	const phrase = operatorPhrase(params.operator);
	return `${left} ${phrase} ${right}`.trim();
}

export function translateRequirementFailure(
	failure: SessionRequirementFailure,
	context: TranslationContext,
): string {
	const { requirement } = failure;
	if (requirement.type === 'evaluator' && requirement.method === 'compare') {
		return translateCompareRequirement(failure, context);
	}
	return failure.message ?? 'Requirement not met';
}
