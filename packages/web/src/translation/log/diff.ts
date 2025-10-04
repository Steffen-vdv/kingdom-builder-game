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
import { collectResourceKeys, type PlayerSnapshot } from './snapshots';
import { type StepEffects } from './statBreakdown';

export function diffStepSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	stepEffects: StepEffects,
	context: EngineContext,
	resourceKeys: ResourceKey[] = collectResourceKeys(
		previousSnapshot,
		nextSnapshot,
	),
): string[] {
	const changeSummaries: string[] = [];
	const sources = collectResourceSources(stepEffects, context);
	appendResourceChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		resourceKeys,
		sources,
	);
	appendStatChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		context,
		stepEffects,
	);
	appendBuildingChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		context,
	);
	appendLandChanges(changeSummaries, previousSnapshot, nextSnapshot, context);
	appendSlotChanges(changeSummaries, previousSnapshot, nextSnapshot);
	appendPassiveChanges(changeSummaries, previousSnapshot, nextSnapshot);
	return changeSummaries;
}
