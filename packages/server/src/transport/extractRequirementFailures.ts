import type {
	SessionActionRequirementList,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol';

export function extractRequirementFailures(error: unknown): {
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: SessionActionRequirementList;
} {
	if (!error || typeof error !== 'object') {
		return {};
	}
	const carrier = error as {
		requirementFailure?: SessionRequirementFailure;
		requirementFailures?: SessionActionRequirementList;
	};
	const single = carrier.requirementFailure;
	const failures = Array.isArray(carrier.requirementFailures)
		? carrier.requirementFailures
		: undefined;
	if (!single && (!failures || failures.length === 0)) {
		return {};
	}
	let requirementFailures: SessionActionRequirementList | undefined;
	if (failures) {
		requirementFailures = structuredClone(failures);
	} else if (single) {
		requirementFailures = [structuredClone(single)];
	}
	const requirementFailure: SessionRequirementFailure | undefined = single
		? structuredClone(single)
		: requirementFailures?.[0];
	const result: {
		requirementFailure?: SessionRequirementFailure;
		requirementFailures?: SessionActionRequirementList;
	} = {};
	if (requirementFailure) {
		result.requirementFailure = requirementFailure;
	}
	if (requirementFailures) {
		result.requirementFailures = requirementFailures;
	}
	return result;
}
