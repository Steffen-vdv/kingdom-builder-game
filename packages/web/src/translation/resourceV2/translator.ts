import type { ContentTranslator, Summary, SummaryGroup } from '../content';
import { registerContentTranslator } from '../content';
import type { TranslationContext } from '../context';
import {
	formatDescriptorLabel,
	formatNumericValue,
	formatRecentChange,
	formatValueLine,
	resolveDescriptor,
	resolveSnapshot,
	resolveTier,
} from './helpers';
import type { ResourceV2TranslationSource } from './types';

interface SummaryOptions {
	includeBounds: boolean;
}

function formatGlobalCostMessage(
	source: ResourceV2TranslationSource,
	context: TranslationContext,
): string | undefined {
	const globalCost = source.globalActionCost;
	if (!globalCost || !context.actionCostResource) {
		return undefined;
	}
	if (context.actionCostResource !== globalCost.resourceId) {
		return undefined;
	}
	const descriptor = resolveDescriptor(source, globalCost.resourceId);
	const amount = formatNumericValue(descriptor, globalCost.amount);
	const label = formatDescriptorLabel(descriptor, globalCost.resourceId);
	return `Main action costs ${amount} ${label}.`;
}

function buildSummary(
	source: ResourceV2TranslationSource,
	context: TranslationContext,
	options: SummaryOptions,
): Summary {
	const entries: Summary = [];
	const groups = new Map<string, SummaryGroup>();

	const costMessage = formatGlobalCostMessage(source, context);
	if (costMessage) {
		entries.push(costMessage);
	}

	const ordered = source.metadata.ordered ?? [];
	if (ordered.length === 0 && source.metadata.descriptors) {
		const standaloneDescriptors = Object.values(
			source.metadata.descriptors,
		).sort((left, right) => {
			const leftOrder = left.order ?? 0;
			const rightOrder = right.order ?? 0;
			if (leftOrder !== rightOrder) {
				return leftOrder - rightOrder;
			}
			return (left.id ?? '').localeCompare(right.id ?? '');
		});
		for (const descriptor of standaloneDescriptors) {
			if (!descriptor.id) {
				continue;
			}
			const snapshot = resolveSnapshot(source, descriptor.id);
			const tier = resolveTier(source, descriptor.id);
			const line = formatValueLine(descriptor.id, descriptor, snapshot, {
				includeBounds: options.includeBounds,
				tier,
			});
			entries.push(line);
		}
		return entries;
	}

	for (const entry of ordered) {
		if (entry.kind === 'group-parent') {
			const title = formatDescriptorLabel(entry.parent, entry.parent.id);
			const groupEntry: SummaryGroup = {
				title,
				items: [],
			};
			entries.push(groupEntry);
			groups.set(entry.groupId, groupEntry);
			continue;
		}
		if (entry.kind === 'value') {
			const id = entry.descriptor.id;
			if (!id) {
				continue;
			}
			const descriptor = resolveDescriptor(source, id) ?? entry.descriptor;
			const snapshot = resolveSnapshot(source, id);
			const tier = resolveTier(source, id);
			const line = formatValueLine(id, descriptor, snapshot, {
				includeBounds: options.includeBounds,
				tier,
			});
			const groupId = entry.groupId;
			if (groupId && groups.has(groupId)) {
				groups.get(groupId)!.items.push(line);
			} else {
				entries.push(line);
			}
		}
	}

	return entries;
}

function buildLogEntries(source: ResourceV2TranslationSource): string[] {
	const recent = source.metadata.recent ?? [];
	const lines: string[] = [];
	for (const change of recent) {
		if (change.amount === 0) {
			continue;
		}
		const descriptor = resolveDescriptor(source, change.resourceId);
		lines.push(formatRecentChange(descriptor, change));
	}
	return lines;
}

class ResourceV2Translator
	implements
		ContentTranslator<ResourceV2TranslationSource, Record<string, never>>
{
	summarize(
		source: ResourceV2TranslationSource,
		context: TranslationContext,
	): Summary {
		return buildSummary(source, context, { includeBounds: false });
	}

	describe(
		source: ResourceV2TranslationSource,
		context: TranslationContext,
	): Summary {
		return buildSummary(source, context, { includeBounds: true });
	}

	log(source: ResourceV2TranslationSource): string[] {
		return buildLogEntries(source);
	}
}

registerContentTranslator('resourceV2', new ResourceV2Translator());

export { ResourceV2Translator };
