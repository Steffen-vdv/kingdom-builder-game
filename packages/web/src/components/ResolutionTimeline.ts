import type { ActionLogLineDescriptor } from '../translation/log/timeline';

interface TimelineNode {
	descriptor: ActionLogLineDescriptor;
	children: TimelineNode[];
	level: number;
}

interface TimelineEntry {
	key: string;
	text: string;
	level: number;
	kind: ActionLogLineDescriptor['kind'];
}

function buildTimelineTree(
	descriptors: ActionLogLineDescriptor[],
): TimelineNode[] {
	const roots: TimelineNode[] = [];
	const stack: TimelineNode[] = [];

	for (const descriptor of descriptors) {
		const node: TimelineNode = {
			descriptor,
			children: [],
			level: 0,
		};

		while (stack.length > 0) {
			const last = stack[stack.length - 1];
			if (!last || descriptor.depth > last.descriptor.depth) {
				break;
			}
			stack.pop();
		}

		const parent = stack.length > 0 ? stack[stack.length - 1] : null;

		if (parent) {
			node.level = parent.level + 1;
			parent.children.push(node);
		} else {
			node.level = 0;
			roots.push(node);
		}

		stack.push(node);
	}

	return roots;
}

function collectCostEntries(nodes: TimelineNode[]): TimelineEntry[] {
	const entries: TimelineEntry[] = [];

	nodes.forEach((node, index) => {
		const baseKey = `cost-${index}`;
		entries.push({
			key: baseKey,
			text: node.descriptor.text,
			level: 0,
			kind: node.descriptor.kind,
		});

		node.children
			.filter((child) => child.descriptor.kind === 'cost-detail')
			.forEach((child, childIndex) =>
				collectCostDetail(child, `${baseKey}-detail-${childIndex}`, 1, entries),
			);
	});

	return entries;
}

function collectCostDetail(
	node: TimelineNode,
	key: string,
	level: number,
	entries: TimelineEntry[],
): void {
	entries.push({
		key,
		text: node.descriptor.text,
		level,
		kind: node.descriptor.kind,
	});

	node.children.forEach((child, index) =>
		collectCostDetail(child, `${key}-${index}`, level + 1, entries),
	);
}

function collectEffectEntries(nodes: TimelineNode[]): TimelineEntry[] {
	const entries: TimelineEntry[] = [];

	nodes.forEach((node, index) =>
		collectEffectNode(node, `effect-${index}`, entries),
	);

	return entries;
}

function collectEffectNode(
	node: TimelineNode,
	key: string,
	entries: TimelineEntry[],
): void {
	entries.push({
		key,
		text: node.descriptor.text,
		level: node.level,
		kind: node.descriptor.kind,
	});

	node.children.forEach((child, index) =>
		collectEffectNode(child, `${key}-${index}`, entries),
	);
}

export type { TimelineEntry, TimelineNode };
export { buildTimelineTree, collectCostEntries, collectEffectEntries };
