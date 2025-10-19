import type { ActionLogLineDescriptor } from '../translation/log/timeline';

interface TimelineNode {
	descriptor: ActionLogLineDescriptor;
	children: TimelineNode[];
	level: number;
}

type TimelineEntryKind = ActionLogLineDescriptor['kind'] | 'section-root';

interface TimelineEntry {
	key: string;
	text: string;
	level: number;
	kind: TimelineEntryKind;
	isSectionRoot?: boolean;
}

function buildTimelineTree(
	descriptors: ActionLogLineDescriptor[] | undefined,
): TimelineNode[] {
	if (!Array.isArray(descriptors) || descriptors.length === 0) {
		return [];
	}
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
	const sectionChildren: TimelineEntry[] = [];
	let costIndex = 0;

	function visit(node: TimelineNode): void {
		if (node.descriptor.kind === 'cost') {
			const baseKey = `cost-${costIndex}`;
			costIndex += 1;
			sectionChildren.push({
				key: baseKey,
				text: node.descriptor.text,
				level: 1,
				kind: node.descriptor.kind,
			});

			node.children
				.filter((child) => child.descriptor.kind === 'cost-detail')
				.forEach((child, childIndex) =>
					collectCostDetail(
						child,
						`${baseKey}-detail-${childIndex}`,
						2,
						sectionChildren,
					),
				);
		}

		node.children.forEach(visit);
	}

	nodes.forEach(visit);

	if (sectionChildren.length === 0) {
		return [];
	}

	return [
		{
			key: 'section-cost',
			text: '💲 Cost',
			level: 0,
			kind: 'section-root',
			isSectionRoot: true,
		},
		...sectionChildren,
	];
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

interface EffectEntryOptions {
	displayedIcon?: string;
	displayedName?: string;
}

function collectEffectEntries(
	nodes: TimelineNode[],
	options?: EffectEntryOptions,
): TimelineEntry[] {
	const sectionChildren: TimelineEntry[] = [];

	nodes.forEach((node, index) =>
		collectEffectNode(node, `effect-${index}`, sectionChildren, options),
	);

	if (sectionChildren.length === 0) {
		return [];
	}

	return [
		{
			key: 'section-effects',
			text: '🪄 Effects',
			level: 0,
			kind: 'section-root',
			isSectionRoot: true,
		},
		...sectionChildren,
	];
}

function isRedundantHeadline(
	node: TimelineNode,
	options: EffectEntryOptions | undefined,
): boolean {
	if (node.descriptor.kind !== 'headline') {
		return false;
	}

	const displayedName = options?.displayedName?.trim();
	const displayedIcon = options?.displayedIcon?.trim();
	if (!displayedName && !displayedIcon) {
		return false;
	}

	const normalizedText = node.descriptor.text.replace(/\s+/gu, ' ').trim();
	const candidates: string[] = [];

	if (displayedIcon && displayedName) {
		candidates.push(`${displayedIcon} ${displayedName}`);
		candidates.push(`${displayedIcon}${displayedName}`);
	}

	if (displayedName) {
		candidates.push(displayedName);
	}

	if (displayedIcon) {
		candidates.push(displayedIcon);
	}

	return candidates
		.map((candidate) => candidate.replace(/\s+/gu, ' ').trim())
		.some((candidate) => candidate.length > 0 && candidate === normalizedText);
}

function collectEffectNode(
	node: TimelineNode,
	key: string,
	entries: TimelineEntry[],
	options: EffectEntryOptions | undefined,
): void {
	if (
		node.descriptor.kind === 'cost' ||
		node.descriptor.kind === 'cost-detail'
	) {
		return;
	}

	if (node.level === 0 && isRedundantHeadline(node, options)) {
		node.children.forEach((child, index) =>
			collectEffectNode(child, `${key}-${index}`, entries, options),
		);
		return;
	}

	const displayLevel = Math.max(node.level, 1);
	entries.push({
		key,
		text: node.descriptor.text,
		level: displayLevel,
		kind: node.descriptor.kind,
	});

	node.children.forEach((child, index) =>
		collectEffectNode(child, `${key}-${index}`, entries, options),
	);
}

export type {
	TimelineEntry,
	TimelineEntryKind,
	TimelineNode,
	EffectEntryOptions,
};
export { buildTimelineTree, collectCostEntries, collectEffectEntries };
