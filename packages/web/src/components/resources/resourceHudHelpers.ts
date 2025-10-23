import type { ResourceV2TierTrackDefinition } from '@kingdom-builder/protocol';
import type {
	SessionResourceTierStateSnapshot,
	SessionResourceValueParentSnapshot,
	SessionResourceValueSnapshot,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol/session';

import type { TranslationAssets } from '../../translation/context';

export interface ResourceHudBadge {
	readonly label: string;
}

export interface ResourceRowEntry {
	readonly id: string;
	readonly safeId: string;
	readonly label: string;
	readonly icon: string;
	readonly formattedAmount: string;
	readonly rawAmount: number;
	readonly touched: boolean;
	readonly badges: readonly ResourceHudBadge[];
	readonly order: number;
}

export interface ResourceParentEntry extends ResourceRowEntry {
	readonly type: 'parent';
	readonly children: readonly ResourceRowEntry[];
}

export interface ResourceStandaloneEntry extends ResourceRowEntry {
	readonly type: 'standalone';
}

export type ResourceHudEntry = ResourceParentEntry | ResourceStandaloneEntry;

export function sanitizeId(id: string): string {
	return id.replace(/[^a-zA-Z0-9]/g, '_');
}

function isValueVisible(
	snapshot:
		| Pick<SessionResourceValueSnapshot, 'amount' | 'touched'>
		| undefined,
): boolean {
	const amount = snapshot?.amount ?? 0;
	const touched = snapshot?.touched ?? false;
	return touched || amount !== 0;
}

function formatNumber(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	});
}

function formatAmount(
	assets: TranslationAssets,
	resourceId: string,
	amount: number,
): string {
	if (assets.resourceV2.displaysAsPercent(resourceId)) {
		return `${formatNumber(amount * 100)}%`;
	}
	return formatNumber(amount);
}

function resolveLabel(
	assets: TranslationAssets,
	resourceId: string,
	fallbackName?: string,
): string {
	const translation = assets.resources[resourceId];
	if (translation?.label) {
		return translation.label;
	}
	if (fallbackName) {
		return fallbackName;
	}
	const spaced = resourceId.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return resourceId;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveIcon(
	assets: TranslationAssets,
	resourceId: string,
	fallbackIcon?: string,
): string {
	const translation = assets.resources[resourceId];
	if (translation?.icon) {
		return translation.icon;
	}
	if (fallbackIcon) {
		return fallbackIcon;
	}
	return '❔';
}

function formatBoundsBadge(
	bounds: SessionResourceValueParentSnapshot['bounds'] | undefined,
): ResourceHudBadge | undefined {
	if (!bounds) {
		return undefined;
	}
	const { lowerBound, upperBound } = bounds;
	if (lowerBound === undefined && upperBound === undefined) {
		return undefined;
	}
	if (lowerBound !== undefined && upperBound !== undefined) {
		return { label: `Bounds ${lowerBound}–${upperBound}` };
	}
	if (lowerBound !== undefined) {
		return { label: `Bounds ≥ ${lowerBound}` };
	}
	return { label: `Bounds ≤ ${upperBound}` };
}

function createBadges(
	bounds: SessionResourceValueParentSnapshot['bounds'] | undefined,
	tierTrack: ResourceV2TierTrackDefinition | undefined,
	tierState: SessionResourceTierStateSnapshot | undefined,
): ResourceHudBadge[] {
	const badges: ResourceHudBadge[] = [];
	const boundsBadge = formatBoundsBadge(bounds);
	if (boundsBadge) {
		badges.push(boundsBadge);
	}
	if (tierTrack) {
		const tierLabel = tierState?.tierId ?? tierState?.nextTierId ?? '—';
		badges.push({ label: `Tier ${tierLabel}` });
	}
	return badges;
}

function createRowEntry(
	assets: TranslationAssets,
	resourceId: string,
	snapshot: SessionResourceValueSnapshot,
	parentSnapshot: SessionResourceValueParentSnapshot | undefined,
): ResourceRowEntry | undefined {
	const metadata = assets.resourceV2.nodes.get(resourceId);
	const display = metadata?.display;
	const bounds = metadata?.bounds ?? parentSnapshot?.bounds;
	if (!isValueVisible(snapshot)) {
		return undefined;
	}
	const amount = snapshot.amount ?? 0;
	return {
		id: resourceId,
		safeId: sanitizeId(resourceId),
		label: resolveLabel(assets, resourceId, display?.name),
		icon: resolveIcon(assets, resourceId, display?.icon),
		formattedAmount: formatAmount(assets, resourceId, amount),
		rawAmount: amount,
		touched: snapshot.touched ?? false,
		badges: createBadges(bounds, metadata?.tierTrack, snapshot.tier),
		order: display?.order ?? Number.MAX_SAFE_INTEGER,
	};
}

export function buildResourceHudEntries(
	values: SessionResourceValueSnapshotMap | undefined,
	assets: TranslationAssets,
): ResourceHudEntry[] {
	if (!values) {
		return [];
	}
	const childMap = new Map<string, ResourceRowEntry[]>();
	const parentSnapshots = new Map<string, SessionResourceValueSnapshot>();
	const parentFallbacks = new Map<string, SessionResourceValueParentSnapshot>();
	const entries: ResourceHudEntry[] = [];

	for (const [id, snapshot] of Object.entries(values)) {
		if (snapshot.parent) {
			const parentId = snapshot.parent.id;
			const row = createRowEntry(assets, id, snapshot, snapshot.parent);
			if (row) {
				const siblings = childMap.get(parentId);
				if (siblings) {
					siblings.push(row);
				} else {
					childMap.set(parentId, [row]);
				}
			}
			if (!parentFallbacks.has(parentId)) {
				parentFallbacks.set(parentId, snapshot.parent);
			}
			continue;
		}
		parentSnapshots.set(id, snapshot);
	}

	const parentIds = new Set(childMap.keys());
	for (const parentId of parentIds) {
		const children = childMap.get(parentId) ?? [];
		const parentSnapshot = parentSnapshots.get(parentId);
		const fallbackParent = parentFallbacks.get(parentId);
		const resolvedSnapshot: SessionResourceValueSnapshot = parentSnapshot ?? {
			amount: fallbackParent?.amount ?? 0,
			touched: fallbackParent?.touched ?? false,
			recentGains: [],
		};
		const metadata = assets.resourceV2.nodes.get(parentId);
		const display = metadata?.display;
		const bounds = metadata?.bounds ?? fallbackParent?.bounds;
		const orderedChildren = children.slice().sort((left, right) => {
			if (left.order !== right.order) {
				return left.order - right.order;
			}
			return left.label.localeCompare(right.label);
		});
		if (orderedChildren.length === 0 && !isValueVisible(resolvedSnapshot)) {
			continue;
		}
		const parentAmount = resolvedSnapshot.amount ?? 0;
		entries.push({
			type: 'parent',
			id: parentId,
			safeId: sanitizeId(parentId),
			label: resolveLabel(assets, parentId, display?.name),
			icon: resolveIcon(assets, parentId, display?.icon),
			formattedAmount: formatAmount(assets, parentId, parentAmount),
			rawAmount: parentAmount,
			touched: resolvedSnapshot.touched ?? false,
			badges: createBadges(bounds, metadata?.tierTrack, resolvedSnapshot.tier),
			order: display?.order ?? Number.MAX_SAFE_INTEGER,
			children: orderedChildren,
		});
	}

	for (const [id, snapshot] of Object.entries(values)) {
		if (snapshot.parent || parentIds.has(id)) {
			continue;
		}
		const row = createRowEntry(assets, id, snapshot, undefined);
		if (!row) {
			continue;
		}
		entries.push({ type: 'standalone', ...row });
	}

	entries.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.label.localeCompare(right.label);
	});

	return entries;
}
