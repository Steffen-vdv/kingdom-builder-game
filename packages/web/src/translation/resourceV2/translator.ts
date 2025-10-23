import type {
	SessionResourceGroupDescriptor,
	SessionResourceOrderedValueEntry,
	SessionResourceRegistryPayload,
	SessionResourceTierStatus,
	SessionResourceValueDescriptor,
	SessionResourceValueMetadata,
	SessionResourceValueSnapshot,
} from '@kingdom-builder/protocol/session';
import { registerContentTranslator } from '../content';
import type { Summary, SummaryGroup } from '../content/types';
import {
	formatGroupParent,
	formatRecentChange,
	formatResourceValue,
	formatTierState,
	formatTierTransition,
	isGroupParentEntry,
	isValueEntry,
} from './format';

export interface ResourceValueTranslationTarget {
	readonly values: Record<string, SessionResourceValueSnapshot>;
	readonly metadata: SessionResourceValueMetadata;
	readonly globalActionCost?: GlobalCostReference | null;
}

type DescriptorMap = Record<string, SessionResourceValueDescriptor>;
type TierMap = Record<string, SessionResourceTierStatus | undefined>;
type GroupMap = Record<string, SessionResourceGroupDescriptor>;

type OrderedEntry = SessionResourceOrderedValueEntry;

type GlobalCostReference = NonNullable<
	SessionResourceRegistryPayload['globalActionCost']
>;

function resolveDescriptors(
	metadata: SessionResourceValueMetadata,
): DescriptorMap {
	return metadata.descriptors ?? {};
}

function resolveTiers(metadata: SessionResourceValueMetadata): TierMap {
	return metadata.tiers ?? {};
}

function resolveGroups(metadata: SessionResourceValueMetadata): GroupMap {
	return metadata.groups ?? {};
}

function resolveOrdered(
	metadata: SessionResourceValueMetadata,
): readonly OrderedEntry[] {
	if (metadata.ordered) {
		return metadata.ordered;
	}
	const descriptors = resolveDescriptors(metadata);
	return Object.freeze(
		Object.values(descriptors).map((descriptor) => ({
			kind: 'value',
			descriptor,
		})),
	);
}

function addChildToGroup(group: SummaryGroup, entry: Summary) {
	group.items.push(...entry);
}

function formatValueSummary(
	descriptor: SessionResourceValueDescriptor,
	snapshot: SessionResourceValueSnapshot | undefined,
	tierStatus: SessionResourceTierStatus | undefined,
): Summary {
	const line = formatResourceValue(descriptor, snapshot);
	const tier = formatTierState(descriptor, tierStatus);
	if (tier) {
		return [line, `  ${tier}`];
	}
	return [line];
}

function ensureGroup(
	summary: Summary,
	groups: Map<string, SummaryGroup>,
	entry: Extract<OrderedEntry, { kind: 'group-parent' }> | undefined,
	groupMeta: SessionResourceGroupDescriptor | undefined,
): SummaryGroup {
	const groupId = entry?.groupId ?? groupMeta?.groupId;
	if (!groupId) {
		const fallback: SummaryGroup = {
			title: entry ? formatGroupParent(entry.parent) : 'Group',
			items: [],
		};
		summary.push(fallback);
		return fallback;
	}
	const existing = groups.get(groupId);
	if (existing) {
		return existing;
	}
	const descriptor = entry?.parent ?? groupMeta?.parent;
	const title = descriptor ? formatGroupParent(descriptor) : groupId;
	const group: SummaryGroup = {
		title,
		items: [],
	};
	summary.push(group);
	groups.set(groupId, group);
	return group;
}

function buildSummary(target: ResourceValueTranslationTarget): Summary {
	const tiers = resolveTiers(target.metadata);
	const ordered = resolveOrdered(target.metadata);
	const groupDescriptors = resolveGroups(target.metadata);
	const summary: Summary = [];
	const groups = new Map<string, SummaryGroup>();
	for (const entry of ordered) {
		if (isGroupParentEntry(entry)) {
			ensureGroup(summary, groups, entry, groupDescriptors[entry.groupId]);
			continue;
		}
		if (!isValueEntry(entry)) {
			continue;
		}
		const descriptor = entry.descriptor;
		const snapshot = descriptor.id ? target.values[descriptor.id] : undefined;
		const tierStatus = descriptor.id ? tiers[descriptor.id] : undefined;
		const lines = formatValueSummary(descriptor, snapshot, tierStatus);
		if (entry.groupId) {
			const group = ensureGroup(
				summary,
				groups,
				undefined,
				groupDescriptors[entry.groupId],
			);
			addChildToGroup(group, lines);
			continue;
		}
		summary.push(...lines);
	}
	return summary;
}

function buildLog(target: ResourceValueTranslationTarget): string[] {
	const descriptors = resolveDescriptors(target.metadata);
	const tiers = resolveTiers(target.metadata);
	const recent = target.metadata.recent ?? [];
	const entries: string[] = [];
	for (const change of recent) {
		const descriptor = descriptors[change.resourceId];
		if (!descriptor) {
			continue;
		}
		entries.push(formatRecentChange(descriptor, change));
		const tierStatus = tiers[change.resourceId];
		const transition = formatTierTransition(descriptor, tierStatus);
		if (transition) {
			entries.push(transition);
		}
	}
	return entries;
}

function buildGlobalActionCost(
	target: ResourceValueTranslationTarget,
): string | undefined {
	if (!target.globalActionCost) {
		return undefined;
	}
	const descriptors = resolveDescriptors(target.metadata);
	const descriptor = descriptors[target.globalActionCost.resourceId];
	if (!descriptor) {
		return undefined;
	}
	const label =
		descriptor.label ?? descriptor.id ?? target.globalActionCost.resourceId;
	const icon = descriptor.icon ? `${descriptor.icon} ` : '';
	return `Global action cost: ${icon}${label}`;
}

registerContentTranslator<ResourceValueTranslationTarget, undefined>(
	'resourceV2:values',
	{
		summarize(target: ResourceValueTranslationTarget): Summary {
			return buildSummary(target);
		},
		describe(target: ResourceValueTranslationTarget): Summary {
			const summary = buildSummary(target);
			const globalCost = buildGlobalActionCost(target);
			if (globalCost) {
				return [...summary, globalCost];
			}
			return summary;
		},
		log(target: ResourceValueTranslationTarget): string[] {
			return buildLog(target);
		},
	},
);
