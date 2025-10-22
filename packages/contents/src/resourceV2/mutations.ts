import { ResourceV2Reconciliation } from './types';
import type {
	ResourceV2PercentRoundingMode,
	ResourceV2BoundMutationDefinition,
	ResourceV2DeltaDefinition,
	ResourceV2EffectDefinition,
	ResourceV2MutationTarget,
	ResourceV2TransferMutationDefinition,
	ResourceV2ValueMutationDefinition,
} from './types';

const CLAMP_ERROR =
	'ResourceV2 builders only expose clamp reconciliation during the MVP. Remove the unsupported reconciliation flag.';
const PARENT_ERROR =
	'ResourceV2 builders cannot target limited virtual parents with value mutations. Point the effect at a child resource instead.';

function ensureClamp(reconciliation?: ResourceV2Reconciliation) {
	if (reconciliation && reconciliation !== ResourceV2Reconciliation.Clamp) {
		throw new Error(CLAMP_ERROR);
	}
}

function ensureClampAll(
	...values: Array<ResourceV2Reconciliation | undefined>
) {
	values.forEach((value) => ensureClamp(value));
}

function assertTarget(target: ResourceV2MutationTarget) {
	if (target.limitedToChildren) {
		throw new Error(PARENT_ERROR);
	}
}

const normaliseDelta = (
	delta: ResourceV2DeltaDefinition | number,
): ResourceV2DeltaDefinition =>
	typeof delta === 'number' ? { amount: delta } : delta;

function createValueMutation(
	operation: ResourceV2ValueMutationDefinition['operation'],
	target: ResourceV2MutationTarget,
	delta: ResourceV2DeltaDefinition | number,
	options: {
		reconciliation?: ResourceV2Reconciliation;
		suppressHooks?: boolean;
	},
): ResourceV2ValueMutationDefinition {
	ensureClamp(options.reconciliation);
	assertTarget(target);
	const mutation: ResourceV2ValueMutationDefinition = {
		kind: 'value',
		operation,
		resourceId: target.id,
		delta: normaliseDelta(delta),
		reconciliation: ResourceV2Reconciliation.Clamp,
	};
	if (options.suppressHooks) {
		mutation.suppressHooks = true;
	}
	return mutation;
}

export const resourceV2Add = (
	target: ResourceV2MutationTarget,
	delta: ResourceV2DeltaDefinition | number,
	options: {
		reconciliation?: ResourceV2Reconciliation;
		suppressHooks?: boolean;
	} = {},
) => createValueMutation('add', target, delta, options);

export const resourceV2Remove = (
	target: ResourceV2MutationTarget,
	delta: ResourceV2DeltaDefinition | number,
	options: {
		reconciliation?: ResourceV2Reconciliation;
		suppressHooks?: boolean;
	} = {},
) => createValueMutation('remove', target, delta, options);

export function resourceV2Transfer(
	from: ResourceV2MutationTarget,
	to: ResourceV2MutationTarget,
	amount: number,
	options: {
		donorReconciliation?: ResourceV2Reconciliation;
		recipientReconciliation?: ResourceV2Reconciliation;
		suppressHooks?: boolean;
	} = {},
): ResourceV2EffectDefinition {
	ensureClampAll(options.donorReconciliation, options.recipientReconciliation);
	assertTarget(from);
	assertTarget(to);
	const mutation: ResourceV2TransferMutationDefinition = {
		kind: 'transfer',
		fromResourceId: from.id,
		toResourceId: to.id,
		amount,
		donorReconciliation: ResourceV2Reconciliation.Clamp,
		recipientReconciliation: ResourceV2Reconciliation.Clamp,
	};
	if (options.suppressHooks) {
		mutation.suppressHooks = true;
	}
	return mutation;
}

function disallowDecrease(
	bound: 'lower' | 'upper',
	operation: 'increase' | 'decrease',
) {
	if (operation === 'decrease') {
		throw new Error(
			`ResourceV2 builders defer ${bound}-bound decreases until after the MVP. Remove the decrease configuration.`,
		);
	}
}

function createBoundMutation(
	bound: ResourceV2BoundMutationDefinition['bound'],
	target: ResourceV2MutationTarget,
	amount: number,
	operation: 'increase' | 'decrease',
): ResourceV2BoundMutationDefinition {
	disallowDecrease(bound, operation);
	return {
		kind: 'bound',
		bound,
		operation: 'increase',
		resourceId: target.id,
		amount,
	};
}

export const adjustResourceV2LowerBound = (
	target: ResourceV2MutationTarget,
	amount: number,
	operation: 'increase' | 'decrease' = 'increase',
) => createBoundMutation('lower', target, amount, operation);

export const adjustResourceV2UpperBound = (
	target: ResourceV2MutationTarget,
	amount: number,
	operation: 'increase' | 'decrease' = 'increase',
) => createBoundMutation('upper', target, amount, operation);

export const percentDelta = (
	percent: number,
	rounding: ResourceV2PercentRoundingMode,
): ResourceV2DeltaDefinition => ({ percent, rounding });

export const flatDelta = (amount: number): ResourceV2DeltaDefinition => ({
	amount,
});
