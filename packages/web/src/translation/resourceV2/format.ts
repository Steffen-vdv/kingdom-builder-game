import type {
	SessionResourceGroupDescriptor,
	SessionResourceGroupPresentation,
} from '@kingdom-builder/protocol/session';
import { gainOrLose, signed } from '../effects/helpers';
import type { SummaryEntry, SummaryGroup } from '../content';
import type {
	ResourceOrderedEntry,
	ResourceValueDescriptor,
	ResourceValueSnapshot,
	ResourceValueTierStatus,
	ResourceValuesTranslationTarget,
} from './types';

const NO_BOUNDS = Object.freeze({}) as ResourceValueSnapshot;

function ensureDescriptorId(
	descriptor: ResourceValueDescriptor | undefined,
	id: string,
): ResourceValueDescriptor {
	if (descriptor) {
		return descriptor;
	}
	return Object.freeze({ id, label: id }) as ResourceValueDescriptor;
}

function resolveDescriptorMap(
	target: ResourceValuesTranslationTarget,
): Map<string, ResourceValueDescriptor> {
	const descriptors = target.metadata.descriptors ?? {};
	const map = new Map<string, ResourceValueDescriptor>();
	for (const [id, descriptor] of Object.entries(descriptors)) {
		map.set(
			id,
			ensureDescriptorId(descriptor as ResourceValueDescriptor | undefined, id),
		);
	}
	return map;
}

function resolveGroupPresentation(
	target: ResourceValuesTranslationTarget,
): Map<string, SessionResourceGroupPresentation> {
	const entries = target.metadata.groups ?? {};
	const map = new Map<string, SessionResourceGroupPresentation>();
	for (const presentation of Object.values(entries)) {
		map.set(presentation.groupId, {
			groupId: presentation.groupId,
			parent: presentation.parent,
			children: Object.freeze(
				(presentation.children ?? []).map(
					(childId) =>
						target.metadata.descriptors?.[childId] ?? { id: childId },
				),
			),
			order: presentation.order,
		});
	}
	return map;
}

function formatDisplayValue(
	value: number,
	descriptor: ResourceValueDescriptor | undefined,
): string {
	const format = descriptor?.format;
	let prefix = '';
	let suffix = '';
	if (typeof format === 'string') {
		prefix = format.trim();
	} else if (format && typeof format === 'object') {
		if (typeof format.prefix === 'string') {
			prefix = format.prefix.trim();
		}
		if (format.percent === true) {
			suffix = '%';
		}
	}
	if (!suffix && descriptor?.displayAsPercent) {
		suffix = '%';
	}
	const numeric = Number.isFinite(value) ? value : 0;
	const formatted = `${numeric}`;
	return `${prefix}${formatted}${suffix}`.trim();
}

function formatBounds(snapshot: ResourceValueSnapshot): string | undefined {
	const lower = snapshot.lowerBound;
	const upper = snapshot.upperBound;
	if (typeof lower === 'number' && typeof upper === 'number') {
		return `${lower}→${upper}`;
	}
	if (typeof lower === 'number') {
		return `${lower}→∞`;
	}
	if (typeof upper === 'number') {
		return `≤${upper}`;
	}
	return undefined;
}

function formatDescriptorLabel(descriptor: ResourceValueDescriptor): string {
	const icon = descriptor.icon?.trim() ?? '';
	const label = descriptor.label?.trim() ?? descriptor.id;
	if (icon && label) {
		return `${icon} ${label}`;
	}
	return icon || label;
}

function formatSnapshot(
	descriptor: ResourceValueDescriptor,
	snapshot: ResourceValueSnapshot,
): string {
	const valueText = formatDisplayValue(snapshot.value ?? 0, descriptor);
	const bounds = formatBounds(snapshot);
	const label = formatDescriptorLabel(descriptor);
	return bounds ? `${label} ${valueText} (${bounds})` : `${label} ${valueText}`;
}

function buildParentTitle(
	parent: SessionResourceGroupDescriptor['parent'],
	snapshot: ResourceValueSnapshot,
): string {
	const icon = parent.icon?.trim() ?? '';
	const label = parent.label?.trim() ?? parent.id;
	const valueText = formatDisplayValue(snapshot.value ?? 0, undefined);
	const base = icon && label ? `${icon} ${label}` : icon || label;
	return `${base} ${valueText}`.trim();
}

function createGroupSummary(
	parent: SessionResourceGroupDescriptor['parent'],
	children: readonly ResourceValueDescriptor[],
	values: ResourceValuesTranslationTarget['values'],
): SummaryGroup {
	const parentSnapshot = values[parent.id] ?? NO_BOUNDS;
	const title = buildParentTitle(parent, parentSnapshot);
	const items: SummaryEntry[] = [];
	for (const child of children) {
		const snapshot = values[child.id] ?? NO_BOUNDS;
		items.push(formatSnapshot(child, snapshot));
	}
	return Object.freeze({ title, items });
}

function buildStandaloneSummary(
	descriptor: ResourceValueDescriptor,
	snapshot: ResourceValueSnapshot,
): string {
	return formatSnapshot(descriptor, snapshot);
}

function formatTierStatus(
	descriptor: ResourceValueDescriptor,
	tier: ResourceValueTierStatus,
): SummaryGroup | null {
	const steps = tier.steps ?? [];
	const current = tier.currentStepId
		? steps.find((step) => step.id === tier.currentStepId)
		: undefined;
	const next = tier.nextStepId
		? steps.find((step) => step.id === tier.nextStepId)
		: undefined;
	const previous = tier.previousStepId
		? steps.find((step) => step.id === tier.previousStepId)
		: undefined;
	const progress = tier.progress;
	const title = `${formatDescriptorLabel(descriptor)} tier`;
	const items: SummaryEntry[] = [];
	if (current) {
		const progressText = progress
			? `${progress.current}/${progress.max ?? progress.current}`
			: undefined;
		const label = current.label ?? current.id;
		items.push(
			progressText
				? `Current: ${label} (${progressText})`
				: `Current: ${label}`,
		);
	} else if (tier.currentStepId) {
		items.push(`Current: ${tier.currentStepId}`);
	}
	if (next) {
		items.push(`Next: ${next.label ?? next.id}`);
	} else if (tier.nextStepId) {
		items.push(`Next: ${tier.nextStepId}`);
	}
	if (previous) {
		items.push(`Previous: ${previous.label ?? previous.id}`);
	} else if (tier.previousStepId) {
		items.push(`Previous: ${tier.previousStepId}`);
	}
	if (!items.length) {
		return null;
	}
	return Object.freeze({ title, items, _desc: true });
}

function formatGlobalActionCost(
	descriptor: ResourceValueDescriptor,
	amount: number,
): string {
	const label = formatDescriptorLabel(descriptor);
	return `All actions cost ${label} ${amount}`;
}

function formatRecentChange(
	descriptor: ResourceValueDescriptor,
	amount: number,
): string {
	const label = formatDescriptorLabel(descriptor);
	return `${gainOrLose(amount)} ${label} ${signed(amount)}${amount}`;
}

export function buildResourceValueSummaries(
	target: ResourceValuesTranslationTarget,
): SummaryEntry[] {
	const descriptors = resolveDescriptorMap(target);
	const groupPresentations = resolveGroupPresentation(target);
	const ordered = target.metadata.ordered ?? [];
	const handledGroups = new Set<string>();
	const entries: SummaryEntry[] = [];
	for (const entry of ordered as ResourceOrderedEntry[]) {
		if (entry.kind === 'group-parent') {
			const group = groupPresentations.get(entry.groupId);
			if (!group) {
				continue;
			}
			entries.push(
				createGroupSummary(
					group.parent,
					group.children.map((child) =>
						ensureDescriptorId(
							child as ResourceValueDescriptor,
							child.id ?? '',
						),
					),
					target.values,
				),
			);
			handledGroups.add(entry.groupId);
			continue;
		}
		if (entry.kind === 'value') {
			if (entry.groupId && handledGroups.has(entry.groupId)) {
				continue;
			}
			const descriptor = ensureDescriptorId(
				(entry.descriptor as ResourceValueDescriptor | undefined) ??
					descriptors.get(entry.descriptor?.id ?? ''),
				entry.descriptor?.id ?? 'value',
			);
			const snapshot = target.values[descriptor.id] ?? NO_BOUNDS;
			entries.push(buildStandaloneSummary(descriptor, snapshot));
		}
	}
	return entries;
}

export function buildResourceValueDescriptions(
	target: ResourceValuesTranslationTarget,
): SummaryEntry[] {
	const descriptors = resolveDescriptorMap(target);
	const tiers = target.metadata.tiers ?? {};
	const entries: SummaryEntry[] = [];
	for (const [resourceId, status] of Object.entries(tiers)) {
		const descriptor = descriptors.get(resourceId);
		if (!descriptor) {
			continue;
		}
		const summary = formatTierStatus(descriptor, status);
		if (summary) {
			entries.push(summary);
		}
	}
	return entries;
}

export function buildResourceValueLogEntries(
	target: ResourceValuesTranslationTarget,
): string[] {
	const descriptors = resolveDescriptorMap(target);
	const recent = target.metadata.recent ?? [];
	const entries: string[] = [];
	for (const change of recent) {
		const descriptor = descriptors.get(change.resourceId);
		if (!descriptor) {
			continue;
		}
		entries.push(formatRecentChange(descriptor, change.amount));
	}
	return entries;
}

export function buildGlobalActionCostSummary(
	target: ResourceValuesTranslationTarget,
): string | undefined {
	const config = target.globalActionCost ?? null;
	if (!config) {
		return undefined;
	}
	const descriptors = resolveDescriptorMap(target);
	const descriptor = descriptors.get(config.resourceId);
	if (!descriptor) {
		return undefined;
	}
	return formatGlobalActionCost(descriptor, config.amount);
}
