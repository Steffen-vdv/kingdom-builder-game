import React, { useMemo } from 'react';
import type {
	ResourceV2BoundsMetadata,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import type {
        SessionPlayerStateSnapshot,
        SessionResourceValueParentSnapshot,
        SessionResourceValueSnapshot,
        SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol/session';
import type { ResourceV2MetadataSelectors } from '../../translation/resourceV2/selectors';
import { useGameEngine } from '../../state/GameContext';
import ResourceRow from './ResourceRow';
import type { ResourceEntry, ResourceGroupEntry } from './types';

const NUMBER_FORMATTER = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2,
});

function formatNumber(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return NUMBER_FORMATTER.format(value);
}

function formatAmount(value: number, displayAsPercent: boolean): string {
	const formatted = formatNumber(value);
	return displayAsPercent ? `${formatted}%` : formatted;
}

function resolveTierLabel(
	tierTrack: ResourceV2TierTrackDefinition | undefined,
	tierId: string | undefined,
): string | undefined {
	if (!tierTrack || !tierId) {
		return undefined;
	}
	for (const tier of tierTrack.tiers) {
		if (tier.id !== tierId) {
			continue;
		}
		return tier.display?.title ?? tier.display?.summary ?? tier.id;
	}
	return tierId;
}

function buildBadges(
	bounds: ResourceV2BoundsMetadata | undefined,
	tierTrack: ResourceV2TierTrackDefinition | undefined,
	tierState: SessionResourceValueSnapshot['tier'] | undefined,
): string[] {
	const badges: string[] = [];
	if (bounds?.lowerBound !== undefined) {
		badges.push(`Min ${formatNumber(bounds.lowerBound)}`);
	}
	if (bounds?.upperBound !== undefined) {
		badges.push(`Max ${formatNumber(bounds.upperBound)}`);
	}
	const tierLabel = resolveTierLabel(tierTrack, tierState?.tierId);
	if (tierLabel) {
		badges.push(`Tier: ${tierLabel}`);
	}
	return badges;
}

function isTouchedVisible(
	value: Pick<SessionResourceValueSnapshot, 'amount' | 'touched' | 'tier'>,
): boolean {
	if (value.touched) {
		return true;
	}
	if (value.amount !== 0) {
		return true;
	}
	if (
		value.tier?.tierId ||
		value.tier?.nextTierId ||
		value.tier?.previousTierId
	) {
		return true;
	}
	return false;
}

interface BuildContext {
        metadata: ResourceV2MetadataSelectors;
        values: SessionResourceValueSnapshotMap;
}

function resolveDisplayOrder(
	metadata: ResourceV2MetadataSelectors,
	id: string,
): number {
	const entry = metadata.nodes.get(id);
	return entry?.display?.order ?? Number.MAX_SAFE_INTEGER;
}

function resolveLabel(
	metadata: ResourceV2MetadataSelectors,
	id: string,
): { label: string; icon?: string } {
	const entry = metadata.nodes.get(id);
	if (entry?.display) {
		const { name, icon } = entry.display;
		const label = name ?? id;
		if (icon !== undefined) {
			return { label, icon };
		}
		return { label };
	}
	return { label: id };
}

function createParentSnapshotFallback(
	fallback: SessionResourceValueParentSnapshot | undefined,
): SessionResourceValueSnapshot {
	const snapshot: SessionResourceValueSnapshot = {
		amount: fallback?.amount ?? 0,
		touched: fallback?.touched ?? false,
		recentGains: [],
	};
	return snapshot;
}

function createResourceEntry(
        context: BuildContext,
        id: string,
        value: SessionResourceValueSnapshot,
): ResourceEntry {
        const { metadata } = context;
        const { label, icon } = resolveLabel(metadata, id);
        const order = resolveDisplayOrder(metadata, id);
        const displayAsPercent = metadata.displaysAsPercent(id);
        const bounds = metadata.selectBounds(id);
        const tierTrack = metadata.selectTierTrack(id);
        const badges = buildBadges(bounds, tierTrack, value.tier);
        const visible = isTouchedVisible(value);
        const entry: ResourceEntry = {
                id,
                label,
                displayValue: formatAmount(value.amount, displayAsPercent),
                badges,
                order,
                visible,
                ...(icon !== undefined ? { icon } : {}),
        };
        return entry;
}

function buildGroupEntries(context: BuildContext): {
	readonly groups: readonly ResourceGroupEntry[];
	readonly parentIds: ReadonlySet<string>;
	readonly childIds: ReadonlySet<string>;
} {
	const groups = new Map<
		string,
		{ parent: ResourceEntry; children: ResourceEntry[] }
	>();
	const parentIds = new Set<string>();
	const childIds = new Set<string>();

	for (const [id, value] of Object.entries(context.values)) {
		const parentId = value.parent?.id;
		if (!parentId) {
			continue;
		}
		childIds.add(id);
		parentIds.add(parentId);
		let group = groups.get(parentId);
		if (!group) {
			const parentValue =
				context.values[parentId] ?? createParentSnapshotFallback(value.parent);
			const parentEntry = createResourceEntry(context, parentId, parentValue);
			group = { parent: parentEntry, children: [] };
			groups.set(parentId, group);
		} else if (!group.parent.visible) {
			const parentValue = context.values[parentId];
			if (parentValue) {
				group.parent = createResourceEntry(context, parentId, parentValue);
			}
		}
		const childEntry = createResourceEntry(context, id, value);
		if (childEntry.visible) {
			group.children.push(childEntry);
		}
	}

	const sortedGroups: ResourceGroupEntry[] = [];
	for (const payload of groups.values()) {
		payload.children.sort((left, right) => {
			if (left.order !== right.order) {
				return left.order - right.order;
			}
			return left.label.localeCompare(right.label);
		});
		const anyChildVisible = payload.children.some((child) => child.visible);
		if (!payload.parent.visible && !anyChildVisible) {
			continue;
		}
		const parentVisible = payload.parent.visible || anyChildVisible;
		const parentEntry: ResourceEntry = parentVisible
			? { ...payload.parent, visible: true }
			: payload.parent;
		sortedGroups.push({
			parent: parentEntry,
			children: payload.children,
		});
	}

	sortedGroups.sort((left, right) => {
		const leftOrder = resolveDisplayOrder(context.metadata, left.parent.id);
		const rightOrder = resolveDisplayOrder(context.metadata, right.parent.id);
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.parent.label.localeCompare(right.parent.label);
	});

	return {
		groups: sortedGroups,
		parentIds,
		childIds,
	};
}

function buildUngroupedEntries(
	context: BuildContext,
	excludedIds: ReadonlySet<string>,
	parentIds: ReadonlySet<string>,
): ResourceEntry[] {
	const entries: ResourceEntry[] = [];
	for (const [id, value] of Object.entries(context.values)) {
		if (excludedIds.has(id) || parentIds.has(id)) {
			continue;
		}
		const entry = createResourceEntry(context, id, value);
		if (!entry.visible) {
			continue;
		}
		entries.push(entry);
	}
	entries.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.label.localeCompare(right.label);
	});
	return entries;
}

interface ResourceHudProps {
        readonly values: SessionResourceValueSnapshotMap;
        readonly metadata: ResourceV2MetadataSelectors;
        readonly className?: string | undefined;
}

export function ResourceHud({ values, metadata, className }: ResourceHudProps) {
	const content = useMemo(() => {
		const context: BuildContext = { metadata, values };
		const { groups, parentIds, childIds } = buildGroupEntries(context);
		const ungrouped = buildUngroupedEntries(context, childIds, parentIds);
		return { groups, ungrouped };
	}, [metadata, values]);

	if (content.groups.length === 0 && content.ungrouped.length === 0) {
		return null;
	}

	return (
		<div
			className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}
		>
			{content.groups.map((group) => (
				<div key={group.parent.id} className="flex flex-col gap-2">
					<ResourceRow entry={group.parent} role="parent" />
					{group.children.map((child) => (
						<ResourceRow key={child.id} entry={child} role="child" />
					))}
				</div>
			))}
			{content.ungrouped.map((entry) => (
				<ResourceRow key={entry.id} entry={entry} role="solo" />
			))}
		</div>
	);
}

interface PlayerResourceHudProps {
	readonly player: SessionPlayerStateSnapshot;
	readonly className?: string;
}

const PlayerResourceHud: React.FC<PlayerResourceHudProps> = ({
	player,
	className,
}) => {
	const { translationContext } = useGameEngine();
	const values = player.values;
	const metadata = translationContext.assets.resourceV2;
	if (!values || Object.keys(values).length === 0) {
		return null;
	}
	return (
		<ResourceHud
			values={values}
			metadata={metadata}
			{...(className ? { className } : {})}
		/>
	);
};

export default PlayerResourceHud;
