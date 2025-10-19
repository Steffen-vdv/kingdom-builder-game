import React from 'react';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';

interface TimelineNode {
	descriptor: ActionLogLineDescriptor;
	children: TimelineNode[];
}

interface TimelineItem {
	node: TimelineNode;
	indent: number;
	key: string;
}

interface TimelineRenderConfig {
	timelineItemClass: string;
	primaryMarkerClass: string;
	nestedMarkerClass: string;
	timelineTextClass: string;
	nestedTimelineTextClass: string;
}

function buildTimelineTree(entries: ActionLogLineDescriptor[]): TimelineNode[] {
	const roots: TimelineNode[] = [];
	const stack: { depth: number; node: TimelineNode }[] = [];
	for (const entry of entries) {
		const node: TimelineNode = { descriptor: entry, children: [] };
		while (stack.length) {
			const current = stack[stack.length - 1]!;
			if (current.depth < entry.depth) {
				break;
			}
			stack.pop();
		}
		const parent = stack[stack.length - 1]?.node;
		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
		stack.push({ depth: entry.depth, node });
	}
	return roots;
}

function findSectionBaseDepth(nodes: TimelineNode[]): number {
	if (!nodes.length) {
		return 0;
	}
	return nodes.reduce((minDepth, node) => {
		return Math.min(minDepth, node.descriptor.depth);
	}, nodes[0]?.descriptor.depth ?? 0);
}

function collectTimelineItems(
	nodes: TimelineNode[],
	baseDepth: number,
): TimelineItem[] {
	const items: TimelineItem[] = [];
	function walk(node: TimelineNode, prefix: string) {
		const indent = Math.max(node.descriptor.depth - baseDepth, 0);
		items.push({ node, indent, key: prefix });
		node.children.forEach((child, index) => {
			walk(child, `${prefix}.${index}`);
		});
	}
	nodes.forEach((node, index) => {
		walk(node, `${index}`);
	});
	return items;
}

function renderTimelineEntry(
	item: TimelineItem,
	prefix: string,
	config: TimelineRenderConfig,
) {
	const { node, indent, key } = item;
	const isRoot = indent === 0;
	const markerClass = isRoot
		? config.primaryMarkerClass
		: config.nestedMarkerClass;
	const itemIndent =
		indent > 0 ? { marginLeft: `${indent * 0.875}rem` } : undefined;
	const textClass = isRoot
		? config.timelineTextClass
		: config.nestedTimelineTextClass;
	return (
		<div
			key={`${prefix}-${key}`}
			className={config.timelineItemClass}
			style={itemIndent}
		>
			<span className={markerClass} aria-hidden="true" />
			<div className={textClass}>{node.descriptor.text}</div>
		</div>
	);
}

export type { TimelineItem, TimelineNode, TimelineRenderConfig };
export {
	buildTimelineTree,
	collectTimelineItems,
	findSectionBaseDepth,
	renderTimelineEntry,
};
