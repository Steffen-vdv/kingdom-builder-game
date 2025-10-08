import {
	resolveActionEffects,
	type ActionTrace,
	type EngineSession,
	type PlayerId,
} from '@kingdom-builder/engine';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import {
	createSnapshotDiffPlayer,
	createSnapshotTranslationDiffContext,
	diffStepSnapshots,
	snapshotPlayer,
	type PlayerSnapshot,
	type TranslationDiffContext,
} from '../translation';
import type { TranslationContext } from '../translation/context';

export function resolveActionDefinition(
	context: TranslationContext,
	id: string,
) {
	try {
		return context.actions.get(id);
	} catch {
		return undefined;
	}
}

export function buildActionDiffContext(
	translationContext: TranslationContext,
	session: EngineSession,
	player: PlayerSnapshot & { id: PlayerId },
): TranslationDiffContext {
	const diffPlayer = createSnapshotDiffPlayer({
		id: player.id,
		lands: player.lands,
		population: player.population,
		passives: player.passives,
	});
	return createSnapshotTranslationDiffContext({
		player: diffPlayer,
		translation: {
			buildings: translationContext.buildings,
			developments: translationContext.developments,
			passives: {
				evaluationMods: translationContext.passives.evaluationMods,
			},
		},
		evaluationMods: session.getPassiveEvaluationMods(),
	});
}

export function buildCostLines(
	costs: Record<string, number | undefined>,
	before: PlayerSnapshot,
): string[] {
	const costLines: string[] = [];
	for (const key of Object.keys(costs)) {
		const amount = costs[key] ?? 0;
		if (!amount) {
			continue;
		}
		const info = RESOURCES[key as keyof typeof RESOURCES];
		const icon = info?.icon ? `${info.icon} ` : '';
		const label = info?.label ?? key;
		const beforeAmount = before.resources[key] ?? 0;
		const afterAmount = beforeAmount - amount;
		costLines.push(
			`    ${icon}${label} -${amount} (${beforeAmount}→${afterAmount})`,
		);
	}
	return costLines;
}

export function collectSubActionChanges({
	traces,
	diffContext,
	resourceKeys,
	messages,
	resolveDefinition,
}: {
	traces: ActionTrace[];
	diffContext: TranslationDiffContext;
	resourceKeys: ResourceKey[];
	messages: string[];
	resolveDefinition: (id: string) => ReturnType<typeof resolveActionDefinition>;
}): string[] {
	const subLines: string[] = [];
	for (const trace of traces) {
		const subStep = resolveDefinition(trace.id);
		if (!subStep) {
			continue;
		}
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
		const icon = typeof subStep.icon === 'string' ? subStep.icon : '';
		const name = subStep.name;
		const line = `  ${icon} ${name}`;
		const index = messages.indexOf(line);
		if (index !== -1) {
			messages.splice(
				index + 1,
				0,
				...subChanges.map((change) => `    ${change}`),
			);
		}
	}
	return subLines;
}

export function normalizeLogLine(line: string): string {
	const trimmed = line.trim();
	if (!trimmed) {
		return '';
	}
	return (trimmed.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();
}

export function filterActionChanges({
	changes,
	messages,
	subLines,
	costs,
}: {
	changes: string[];
	messages: string[];
	subLines: string[];
	costs: Record<string, number | undefined>;
}): string[] {
	const subPrefixes = subLines.map(normalizeLogLine);
	const messagePrefixes = new Set<string>();
	for (const line of messages) {
		const normalized = normalizeLogLine(line);
		if (normalized) {
			messagePrefixes.add(normalized);
		}
	}
	const costKeys = Object.keys(costs);
	return changes.filter((line) => {
		const normalizedLine = normalizeLogLine(line);
		if (messagePrefixes.has(normalizedLine)) {
			return false;
		}
		if (subPrefixes.includes(normalizedLine)) {
			return false;
		}
		for (const key of costKeys) {
			const info = RESOURCES[key as keyof typeof RESOURCES];
			const label = info?.label ?? key;
			const prefix = info?.icon ? `${info.icon} ${label}` : label;
			if (line.startsWith(prefix)) {
				return false;
			}
		}
		return true;
	});
}
