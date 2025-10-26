import type { EngineContext } from '../context';
import {
	getResourceValue,
	setResourceValue,
	resolveResourceDefinition,
} from '../resource-v2';
import type { PopulationRoleId } from '../state';

interface PopulationValueUpdateResult {
	previousValue: number;
	nextValue: number;
	changed: boolean;
}

function coerceTargetValue(value: number): number {
	if (!Number.isFinite(value)) {
		throw new Error(
			`Population effects require numeric targets but received ${value}.`,
		);
	}
	if (!Number.isInteger(value)) {
		return Math.trunc(value);
	}
	return value;
}

export function setPopulationRoleValue(
	context: EngineContext,
	role: PopulationRoleId,
	target: number,
): PopulationValueUpdateResult {
	const player = context.activePlayer;
	const resourceId = player.getPopulationResourceV2Id(role);
	const previousValue = getResourceValue(player, resourceId);
	const catalog = context.resourceCatalogV2;
	const coercedTarget = coerceTargetValue(target);
	const lookup = resolveResourceDefinition(catalog, resourceId);
	if (!lookup) {
		throw new Error(
			`Population role "${role}" does not map to a ResourceV2 entry in the runtime catalog.`,
		);
	}
	if (lookup.kind !== 'resource') {
		throw new Error(
			`Population role "${role}" cannot mutate parent resource "${resourceId}"; parent values are derived from children.`,
		);
	}
	const nextValue = setResourceValue(
		context,
		player,
		catalog,
		resourceId,
		coercedTarget,
	);
	return {
		previousValue,
		nextValue,
		changed: nextValue !== previousValue,
	};
}
