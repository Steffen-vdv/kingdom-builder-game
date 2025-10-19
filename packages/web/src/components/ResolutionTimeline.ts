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
	kind: ActionLogLineDescriptor['kind'] | 'section';
}

interface CollectEffectEntriesOptions {
	skipHeadlines?: readonly string[];
}

interface BuildResolutionTimelineOptions {
	actionIcon?: string;
	actionName?: string;
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
	const entries: TimelineEntry[] = [];
	let costIndex = 0;

	function visit(node: TimelineNode): void {
		if (node.descriptor.kind === 'cost') {
			const baseKey = `cost-${costIndex}`;
			costIndex += 1;
			entries.push({
				key: baseKey,
				text: node.descriptor.text,
				level: 0,
				kind: node.descriptor.kind,
			});

			node.children
				.filter((child) => child.descriptor.kind === 'cost-detail')
				.forEach((child, childIndex) =>
					collectCostDetail(
						child,
						`${baseKey}-detail-${childIndex}`,
						1,
						entries,
					),
				);
		}

		node.children.forEach(visit);
	}

	nodes.forEach(visit);

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

function collectEffectEntries(
	nodes: TimelineNode[],
	options?: CollectEffectEntriesOptions,
): TimelineEntry[] {
	const entries: TimelineEntry[] = [];
	const skipHeadlines = normalizeHeadlineSet(options?.skipHeadlines ?? []);

	nodes.forEach((node, index) =>
		collectEffectNode(node, `effect-${index}`, entries, skipHeadlines),
	);

	return entries;
}

function collectEffectNode(
	node: TimelineNode,
	key: string,
	entries: TimelineEntry[],
	skipHeadlines: Set<string>,
): void {
	const descriptorText = node.descriptor.text;
	const normalizedText = normalizeHeadline(descriptorText);
	const shouldSkipHeadline =
		node.descriptor.kind === 'headline' && skipHeadlines.has(normalizedText);

	if (
		!shouldSkipHeadline &&
		node.descriptor.kind !== 'cost' &&
		node.descriptor.kind !== 'cost-detail'
	) {
		entries.push({
			key,
			text: descriptorText,
			level: node.level,
			kind: node.descriptor.kind,
		});
	}

	node.children.forEach((child, index) =>
		collectEffectNode(child, `${key}-${index}`, entries, skipHeadlines),
	);
}

function buildResolutionTimelineEntries(
	nodes: TimelineNode[],
	options?: BuildResolutionTimelineOptions,
): TimelineEntry[] {
	const entries: TimelineEntry[] = [];
	const costEntries = adjustEntryLevels(collectCostEntries(nodes));

	if (costEntries.length > 0) {
		entries.push({
			key: 'section-cost',
			text: '💲 Cost',
			level: 0,
			kind: 'section',
		});
		costEntries.forEach((entry) =>
			entries.push({
				...entry,
				level: entry.level + 1,
			}),
		);
	}

	const combinedHeadline = buildHeadline(options);
	const effectEntries = adjustEntryLevels(
		collectEffectEntries(nodes, {
			skipHeadlines: combinedHeadline ? [combinedHeadline] : [],
		}),
	);

	if (effectEntries.length > 0) {
		entries.push({
			key: 'section-effects',
			text: '🪄 Effects',
			level: 0,
			kind: 'section',
		});
		effectEntries.forEach((entry) =>
			entries.push({
				...entry,
				level: entry.level + 1,
			}),
		);
	}

	return entries;
}

function adjustEntryLevels(entries: TimelineEntry[]): TimelineEntry[] {
	if (entries.length === 0) {
		return entries;
	}

	const minimumLevel = entries.reduce(
		(currentMinimum, entry) => Math.min(currentMinimum, entry.level),
		entries[0]?.level ?? 0,
	);

	return entries.map((entry) => ({
		...entry,
		level: entry.level - minimumLevel,
	}));
}

function buildHeadline(
	options: BuildResolutionTimelineOptions | undefined,
): string | null {
	const actionIcon = options?.actionIcon?.trim();
	const actionName = options?.actionName?.trim();

	if (!actionIcon || !actionName) {
		return null;
	}

	return `${actionIcon} ${actionName}`.replace(/\s+/g, ' ').trim();
}

function normalizeHeadlineSet(headlines: readonly string[]): Set<string> {
	const normalized = new Set<string>();

	headlines.forEach((headline) => {
		const normalizedHeadline = normalizeHeadline(headline);
		if (normalizedHeadline.length > 0) {
			normalized.add(normalizedHeadline);
		}
	});

	return normalized;
}

function normalizeHeadline(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export type { TimelineEntry, TimelineNode };
export {
	buildResolutionTimelineEntries,
	buildTimelineTree,
	collectCostEntries,
	collectEffectEntries,
};
