import {
	resolveActionEffects,
	type ActionTrace,
} from '@kingdom-builder/engine';
import { type ResourceKey } from '@kingdom-builder/contents';
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
	subLines,
}: FilterActionDiffChangesOptions): string[] {
	const subPrefixes = subLines.map(normalizeLine);
	const messagePrefixes = new Set<string>();
	for (const line of messages) {
		const normalized = normalizeLine(line);
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
