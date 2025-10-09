import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { ActionTrace } from '@kingdom-builder/protocol/actions';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import { diffStepSnapshots, snapshotPlayer } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { TranslationDiffContext } from '../translation';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';

interface AppendSubActionChangesOptions {
	traces: ActionTrace[];
	context: TranslationContext;
	differenceContext: TranslationDiffContext;
	resourceKeys: ResourceKey[];
	messages: ActionLogLineDescriptor[];
}

export function appendSubActionChanges({
	traces,
	context,
	differenceContext,
	resourceKeys,
	messages,
}: AppendSubActionChangesOptions): string[] {
	const subActionChangeSummaries: string[] = [];
	for (const trace of traces) {
		const subStep = context.actions.get(trace.id);
		const subResolved = resolveActionEffects(subStep);
		const subChanges = diffStepSnapshots(
			snapshotPlayer(trace.before),
			snapshotPlayer(trace.after),
			subResolved,
			differenceContext,
			resourceKeys,
		);
		if (!subChanges.length) {
			continue;
		}
		subActionChangeSummaries.push(...subChanges);
		const actionDefinition = context.actions.get(trace.id);
		const icon = actionDefinition?.icon ?? '';
		const name = actionDefinition?.name ?? trace.id;
		const trimmed = `${[icon, name].filter(Boolean).join(' ').trim()}`;
		const index = messages.findIndex((entry) => {
			if (entry.kind === 'subaction') {
				if (entry.refId === trace.id) {
					return true;
				}
				if (entry.text === trimmed) {
					return true;
				}
			}
			return false;
		});
		if (index === -1) {
			continue;
		}
		const parentDepth = messages[index]?.depth ?? 1;
		const nested = subChanges.map<ActionLogLineDescriptor>((change) => ({
			text: change,
			depth: parentDepth + 1,
			kind: 'effect',
		}));
		messages.splice(index + 1, 0, ...nested);
	}
	return subActionChangeSummaries;
}

interface BuildActionCostLinesOptions {
	costs: Partial<Record<ResourceKey, number | undefined>>;
	beforeResources: Partial<Record<ResourceKey, number | undefined>>;
}

export function buildActionCostLines({
	costs,
	beforeResources,
}: BuildActionCostLinesOptions): ActionLogLineDescriptor[] {
	const costLines: ActionLogLineDescriptor[] = [];
	const costKeys = Object.keys(costs) as ResourceKey[];
	for (const key of costKeys) {
		const costAmount = costs[key] ?? 0;
		if (!costAmount) {
			continue;
		}
		const info = RESOURCES[key];
		const icon = info?.icon ? `${info.icon} ` : '';
		const label = info?.label ?? key;
		const beforeAmount = beforeResources[key] ?? 0;
		const afterAmount = beforeAmount - costAmount;
		const costDelta = `${beforeAmount}→${afterAmount}`;
		costLines.push({
			text: `${icon}${label} -${costAmount} (${costDelta})`,
			depth: 2,
			kind: 'cost-detail',
		});
	}
	return costLines;
}

interface FilterActionDiffChangesOptions {
	changes: string[];
	messages: ActionLogLineDescriptor[];
	subActionChangeSummaries: string[];
}

function normalizeLine(line: string): string {
	const trimmed = line.trim();
	if (!trimmed) {
		return '';
	}
	return trimmed.replace(/\s*\([^)]*\)\s*$/, '');
}

export function filterActionDiffChanges({
	changes,
	messages,
	subActionChangeSummaries,
}: FilterActionDiffChangesOptions): string[] {
	const subPrefixes = subActionChangeSummaries.map(normalizeLine);
	const messagePrefixes = new Set<string>();
	for (const line of messages) {
		const normalized = normalizeLine(line.text);
		if (normalized) {
			messagePrefixes.add(normalized);
		}
	}
	return changes.filter((line) => {
		const normalizedLine = normalizeLine(line);
		if (messagePrefixes.has(normalizedLine)) {
			return false;
		}
		if (subPrefixes.includes(normalizedLine)) {
			return false;
		}
		return true;
	});
}
