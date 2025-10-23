import type {
	ResourceV2BoundsMetadata,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import type {
	SessionResourceTierStateSnapshot,
	SessionResourceValueSnapshot,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol/session';
import {
	selectResourceBounds,
	selectResourceDisplay,
	selectResourceTierTrack,
} from '../../translation/context/assetSelectors';
import type { TranslationAssets } from '../../translation/context';

export interface ResourceHudEntryNode {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
	readonly amount: number;
	readonly touched: boolean;
	readonly bounds?: ResourceV2BoundsMetadata;
	readonly tier?: SessionResourceTierStateSnapshot;
	readonly tierTrack?: ResourceV2TierTrackDefinition;
	readonly order: number;
	isParent: boolean;
	readonly isGlobalCost: boolean;
	readonly parentId?: string;
	children: ResourceHudEntryNode[];
	visible: boolean;
}

export function shouldDisplayChild(entry: ResourceHudEntryNode): boolean {
	if (entry.isGlobalCost) {
		return true;
	}
	if (entry.touched) {
		return true;
	}
	if (entry.amount !== 0) {
		return true;
	}
	if (entry.children.some((child) => child.visible)) {
		return true;
	}
	return false;
}

export function shouldDisplayParent(entry: ResourceHudEntryNode): boolean {
	if (entry.touched) {
		return true;
	}
	if (entry.amount !== 0) {
		return true;
	}
	if (entry.children.some((child) => child.visible)) {
		return true;
	}
	return false;
}

export function applyParentVisibility(entry: ResourceHudEntryNode): void {
	for (const child of entry.children) {
		child.visible = shouldDisplayChild(child);
	}
	entry.visible = shouldDisplayParent(entry);
}

export function buildEntry(
	assets: TranslationAssets | undefined,
	id: string,
	snapshot: SessionResourceValueSnapshot,
	metadataOrder: number,
	isGlobalCost: boolean,
	parentId: string | undefined,
): ResourceHudEntryNode {
	const display = selectResourceDisplay(assets, id);
	const tierTrack = selectResourceTierTrack(assets, id);
	const bounds = selectResourceBounds(assets, id);
	const tier = snapshot.tier;
	return {
		id,
		label: display.label,
		...(display.icon ? { icon: display.icon } : {}),
		...(display.description ? { description: display.description } : {}),
		amount: snapshot.amount,
		touched: snapshot.touched,
		...(bounds ? { bounds } : {}),
		...(tier ? { tier } : {}),
		...(tierTrack ? { tierTrack } : {}),
		order: metadataOrder,
		isParent: false,
		isGlobalCost,
		...(parentId ? { parentId } : {}),
		children: [],
		visible: false,
	};
}

export function sortEntries(entries: ResourceHudEntryNode[]): void {
	entries.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		if (left.isParent !== right.isParent) {
			return left.isParent ? -1 : 1;
		}
		return left.label.localeCompare(right.label);
	});
}

export function normalizeValues(
	values: SessionResourceValueSnapshotMap | undefined,
): [string, SessionResourceValueSnapshot][] {
	if (!values) {
		return [];
	}
	return Object.entries(values);
}
