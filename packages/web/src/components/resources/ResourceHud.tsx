import React, { useMemo } from 'react';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceValueSnapshot,
} from '@kingdom-builder/protocol/session';
import { useGameEngine } from '../../state/GameContext';
import {
	applyParentVisibility,
	buildEntry,
	normalizeValues,
	shouldDisplayChild,
	sortEntries,
} from './ResourceHudData';
import type { ResourceHudEntryNode } from './ResourceHudData';
import { ResourceHudEntryView } from './ResourceHudEntryView';

interface ResourceHudProps {
	player: SessionPlayerStateSnapshot;
	className?: string;
}

function linkChildren(
	resourceValues: [string, SessionResourceValueSnapshot][],
): Map<string, Set<string>> {
	const parentChildren = new Map<string, Set<string>>();
	for (const [resourceId, snapshot] of resourceValues) {
		const parentId = snapshot.parent?.id;
		if (!parentId) {
			continue;
		}
		const children = parentChildren.get(parentId);
		if (children) {
			children.add(resourceId);
		} else {
			parentChildren.set(parentId, new Set<string>([resourceId]));
		}
	}
	return parentChildren;
}

function createChildParentMap(
	resourceValues: [string, SessionResourceValueSnapshot][],
): Map<string, string> {
	const childParentMap = new Map<string, string>();
	for (const [resourceId, snapshot] of resourceValues) {
		const parentId = snapshot.parent?.id;
		if (parentId) {
			childParentMap.set(resourceId, parentId);
		}
	}
	return childParentMap;
}

export default function ResourceHud({
	player,
	className = '',
}: ResourceHudProps) {
	const { translationContext } = useGameEngine();
	const assets = translationContext.assets;
	const { entries, hasVisibleEntries } = useMemo(() => {
		const resourceValues = normalizeValues(player.values);
		if (resourceValues.length === 0) {
			return {
				entries: [] as ResourceHudEntryNode[],
				hasVisibleEntries: false,
			};
		}
		const nodes = translationContext.assets.resourceV2.nodes;
		const globalCost =
			translationContext.assets.resourceV2.selectGlobalActionCost();
		const globalCostId = globalCost?.resourceId;
		const childParentMap = createChildParentMap(resourceValues);
		const parentChildren = linkChildren(resourceValues);
		const entryMap = new Map<string, ResourceHudEntryNode>();
		for (const [resourceId, snapshot] of resourceValues) {
			const metadataOrder = nodes.get(resourceId)?.display?.order ?? 0;
			const entry = buildEntry(
				assets,
				resourceId,
				snapshot,
				metadataOrder,
				resourceId === globalCostId,
				childParentMap.get(resourceId),
			);
			entryMap.set(resourceId, entry);
		}
		for (const [parentId, childrenSet] of parentChildren) {
			const parentEntry = entryMap.get(parentId);
			if (!parentEntry) {
				continue;
			}
			parentEntry.isParent = true;
			const childEntries: ResourceHudEntryNode[] = [];
			for (const childId of childrenSet) {
				const childEntry = entryMap.get(childId);
				if (childEntry) {
					childEntries.push(childEntry);
				}
			}
			sortEntries(childEntries);
			parentEntry.children = childEntries;
		}
		const orderedEntries: ResourceHudEntryNode[] = [];
		for (const entry of entryMap.values()) {
			if (entry.parentId) {
				continue;
			}
			if (entry.isParent) {
				applyParentVisibility(entry);
				orderedEntries.push(entry);
				continue;
			}
			entry.visible = shouldDisplayChild(entry);
			orderedEntries.push(entry);
		}
		sortEntries(orderedEntries);
		const filtered = orderedEntries.filter((entry) => entry.visible);
		return {
			entries: filtered,
			hasVisibleEntries: filtered.length > 0,
		};
	}, [assets, player.values, translationContext.assets]);

	if (!hasVisibleEntries) {
		return null;
	}

	const icon = '🛡️';
	const containerClass = ['info-bar resource-hud flex-wrap', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={containerClass}>
			<span className="info-bar__icon" aria-hidden="true">
				{icon}
			</span>
			{entries.map((entry) => (
				<ResourceHudEntryView key={entry.id} assets={assets} entry={entry} />
			))}
		</div>
	);
}
