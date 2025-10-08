import {
	resolveActionEffects,
	type ActionTrace,
} from '@kingdom-builder/engine';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import { diffStepSnapshots, snapshotPlayer } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { TranslationDiffContext } from '../translation';

interface AppendSubActionChangesOptions {
	traces: ActionTrace[];
	context: TranslationContext;
	diffContext: TranslationDiffContext;
	resourceKeys: ResourceKey[];
	messages: string[];
}

export function appendSubActionChanges({
	traces,
	context,
	diffContext,
	resourceKeys,
	messages,
}: AppendSubActionChangesOptions): string[] {
	const subLines: string[] = [];
	for (const trace of traces) {
		const subStep = context.actions.get(trace.id);
		const subResolved = resolveActionEffects(subStep);
		const subChanges = diffStepSnapshots(
			snapshotPlayer(trace.before),
			snapshotPlayer(trace.after),
			subResolved,
			diffContext,
			resourceKeys,
		);
		if (!subChanges.length) {
			continue;
		}
		subLines.push(...subChanges);
		const actionDefinition = context.actions.get(trace.id);
		const icon = actionDefinition?.icon ?? '';
		const name = actionDefinition?.name ?? trace.id;
		const line = `  ${icon} ${name}`;
		const index = messages.indexOf(line);
		if (index !== -1) {
			const indented = subChanges.map((change) => `    ${change}`);
			messages.splice(index + 1, 0, ...indented);
		}
	}
	return subLines;
}

interface FilterActionDiffChangesOptions {
	changes: string[];
	messages: string[];
	subLines: string[];
	costs: Record<string, number | undefined>;
}

function normalizeLine(line: string): string {
	const trimmed = line.trim();
	if (!trimmed) {
		return '';
	}
	return (trimmed.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();
}

export function filterActionDiffChanges({
	changes,
	messages,
	subLines,
	costs,
}: FilterActionDiffChangesOptions): string[] {
	const subPrefixes = subLines.map(normalizeLine);
	const messagePrefixes = new Set<string>();
	for (const line of messages) {
		const normalized = normalizeLine(line);
		if (normalized) {
			messagePrefixes.add(normalized);
		}
	}
	const costLabels = new Set(Object.keys(costs) as (keyof typeof RESOURCES)[]);
	return changes.filter((line) => {
		const normalizedLine = normalizeLine(line);
		if (messagePrefixes.has(normalizedLine)) {
			return false;
		}
		if (subPrefixes.includes(normalizedLine)) {
			return false;
		}
		for (const key of costLabels) {
			const info = RESOURCES[key];
			const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
			if (prefix && line.startsWith(prefix)) {
				return false;
			}
		}
		return true;
	});
}
