import { collectResourceSources } from './resourceSources';
import { type TranslationDiffContext } from './resourceSources/context';
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
	diffContext: TranslationDiffContext,
	resourceKeys: string[] = collectResourceKeys(previousSnapshot, nextSnapshot),
): string[] {
	const changeSummaries: string[] = [];
	const sources = collectResourceSources(stepEffects, diffContext);
	appendResourceChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		resourceKeys,
		diffContext.assets,
		sources,
	);
	appendStatChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		nextSnapshot,
		stepEffects,
		diffContext.assets,
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
	appendSlotChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		diffContext.assets,
	);
	appendPassiveChanges(
		changeSummaries,
		previousSnapshot,
		nextSnapshot,
		diffContext.assets,
	);
	return changeSummaries;
}
