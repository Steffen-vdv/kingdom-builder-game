import { type EngineContext } from '@kingdom-builder/engine';
import { type ResourceKey } from '@kingdom-builder/contents';
import { collectResourceSources } from './resourceSources';
import { createTranslationDiffContext } from './resourceSources/context';
import {
	appendResourceChanges,
	appendStatChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';
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
	const diffContext = createTranslationDiffContext(context);
	const sources = collectResourceSources(stepEffects, diffContext);
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
		diffContext,
	);
	appendLandChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		diffContext,
	);
	appendSlotChanges(changeSummaries, previousSnapshot, nextSnapshot);
	appendPassiveChanges(changeSummaries, previousSnapshot, nextSnapshot);
	return changeSummaries;
}
