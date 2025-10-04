import { type EngineContext } from '@kingdom-builder/engine';
import { type ResourceKey } from '@kingdom-builder/contents';
import { collectResourceSources } from './resourceSources';
import {
	appendResourceChanges,
	appendStatChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
	appendPassiveChanges,
} from './diffSections';
import { type PlayerSnapshot } from './playerSnapshot';
import { type StepEffects } from './statBreakdown';

function collectResourceKeys(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
): ResourceKey[] {
	return Object.keys({
		...before.resources,
		...after.resources,
	}) as ResourceKey[];
}

export function diffSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
	resourceKeys: ResourceKey[] = collectResourceKeys(before, after),
): string[] {
	const changes: string[] = [];
	appendResourceChanges(changes, before, after, resourceKeys);
	appendStatChanges(changes, before, after, context, undefined);
	appendBuildingChanges(changes, before, after, context);
	appendLandChanges(changes, before, after, context);
	appendSlotChanges(changes, before, after);
	appendPassiveChanges(changes, before, after);
	return changes;
}

export function diffStepSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	step: StepEffects,
	context: EngineContext,
	resourceKeys: ResourceKey[] = collectResourceKeys(before, after),
): string[] {
	const changes: string[] = [];
	const sources = collectResourceSources(step, context);
	appendResourceChanges(changes, before, after, resourceKeys, sources);
	appendStatChanges(changes, before, after, context, step);
	appendBuildingChanges(changes, before, after, context);
	appendLandChanges(changes, before, after, context);
	appendSlotChanges(changes, before, after);
	appendPassiveChanges(changes, before, after);
	return changes;
}
