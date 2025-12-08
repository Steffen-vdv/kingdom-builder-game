import { collectResourceSources } from './resourceSources';
import { type TranslationDiffContext } from './resourceSources/context';
import {
	appendResourceChanges,
	appendPercentBreakdownChanges,
	appendBuildingChanges,
	appendLandChanges,
	appendSlotChanges,
} from './diffSections';
import { appendPassiveChanges } from './passiveChanges';
import { collectResourceKeys, type PlayerSnapshot } from './snapshots';
import { type StepEffects } from './resourceBreakdown';

export interface ActionDiffChange {
	summary: string;
	children?: ActionDiffChange[];
	meta?: {
		resourceKey?: string;
	};
}

export interface FlattenedActionDiffChange {
	readonly change: ActionDiffChange;
	readonly depth: number;
}

export interface DiffStepSnapshotsOptions {
	tieredResourceKey?: string;
}

export interface DiffStepSnapshotsResult {
	tree: ActionDiffChange[];
	summaries: string[];
}

export function flattenActionDiffChanges(
	changes: readonly ActionDiffChange[],
	depth = 1,
): FlattenedActionDiffChange[] {
	const flattened: FlattenedActionDiffChange[] = [];
	for (const change of changes) {
		flattened.push({ change, depth });
		if (change.children && change.children.length > 0) {
			flattened.push(...flattenActionDiffChanges(change.children, depth + 1));
		}
	}
	return flattened;
}

function createChangeNode(summary: string): ActionDiffChange {
	return { summary };
}

export function diffStepSnapshots(
	previousSnapshot: PlayerSnapshot,
	nextSnapshot: PlayerSnapshot,
	stepEffects: StepEffects,
	diffContext: TranslationDiffContext,
	resourceKeys: string[] = collectResourceKeys(previousSnapshot, nextSnapshot),
	options: DiffStepSnapshotsOptions = {},
): DiffStepSnapshotsResult {
	const changeTree: ActionDiffChange[] = [];
	const summarySet = new Set<string>();
	const sources = collectResourceSources(stepEffects, diffContext);
	const resourceNodes = new Map<string, ActionDiffChange>();

	const resourceChanges = appendResourceChanges(
		previousSnapshot,
		nextSnapshot,
		resourceKeys,
		diffContext.assets,
		diffContext.resourceMetadata,
		sources,
		{ trackByKey: resourceNodes },
	);
	for (const change of resourceChanges) {
		changeTree.push(change);
		summarySet.add(change.summary);
	}

	const percentBreakdownChanges: string[] = [];
	appendPercentBreakdownChanges(
		percentBreakdownChanges,
		previousSnapshot,
		nextSnapshot,
		nextSnapshot,
		stepEffects,
		diffContext.assets,
		diffContext.resourceMetadata,
	);
	for (const summary of percentBreakdownChanges) {
		if (!summary || !summary.trim()) {
			continue;
		}
		changeTree.push(createChangeNode(summary));
		summarySet.add(summary);
	}

	const buildingChanges: string[] = [];
	appendBuildingChanges(
		buildingChanges,
		previousSnapshot,
		nextSnapshot,
		diffContext,
	);
	for (const summary of buildingChanges) {
		if (!summary || !summary.trim()) {
			continue;
		}
		changeTree.push(createChangeNode(summary));
		summarySet.add(summary);
	}

	const landChanges: string[] = [];
	appendLandChanges(landChanges, previousSnapshot, nextSnapshot, diffContext);
	for (const summary of landChanges) {
		if (!summary || !summary.trim()) {
			continue;
		}
		changeTree.push(createChangeNode(summary));
		summarySet.add(summary);
	}

	const slotChanges: string[] = [];
	appendSlotChanges(
		slotChanges,
		previousSnapshot,
		nextSnapshot,
		diffContext.assets,
	);
	for (const summary of slotChanges) {
		if (!summary || !summary.trim()) {
			continue;
		}
		changeTree.push(createChangeNode(summary));
		summarySet.add(summary);
	}

	const passiveOptions = {
		resourceNodes,
		existingSummaries: summarySet,
		...(options.tieredResourceKey
			? { tieredResourceKey: options.tieredResourceKey }
			: {}),
	};
	const passiveChanges = appendPassiveChanges(
		previousSnapshot,
		nextSnapshot,
		diffContext.assets,
		passiveOptions,
	);
	for (const change of passiveChanges) {
		changeTree.push(change);
	}

	const flattened = flattenActionDiffChanges(changeTree);
	const summaries = flattened.map(({ change }) => change.summary);
	return { tree: changeTree, summaries };
}
