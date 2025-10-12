import { resolveActionEffects } from '@kingdom-builder/protocol';
import type {
	ActionExecuteErrorResponse,
	ActionTrace,
} from '@kingdom-builder/protocol/actions';
import { diffStepSnapshots, snapshotPlayer } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { TranslationDiffContext } from '../translation';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type { SessionRequirementFailure } from '@kingdom-builder/protocol/session';
import { getLegacySessionContext } from './getLegacySessionContext';

export type ActionRequirementFailures =
	ActionExecuteErrorResponse['requirementFailures'];
export type ActionExecutionError = Error & {
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: ActionRequirementFailures;
};

export function createActionExecutionError(
	response: ActionExecuteErrorResponse,
): ActionExecutionError {
	const failure = new Error(response.error) as ActionExecutionError;
	if (response.requirementFailure) {
		failure.requirementFailure = response.requirementFailure;
	}
	if (response.requirementFailures) {
		failure.requirementFailures = response.requirementFailures;
	}
	return failure;
}

export type LegacyContextOptions = Parameters<
	typeof getLegacySessionContext
>[0];

export function safeGetLegacySessionContext(
	options: LegacyContextOptions,
	onFatalSessionError?: (error: unknown) => void,
): ReturnType<typeof getLegacySessionContext> | null {
	try {
		return getLegacySessionContext(options);
	} catch (error) {
		if (onFatalSessionError) {
			onFatalSessionError(error);
		}
		return null;
	}
}

interface AppendSubActionChangesOptions {
	traces: ActionTrace[];
	context: TranslationContext;
	diffContext: TranslationDiffContext;
	resourceKeys: SessionResourceKey[];
	messages: ActionLogLineDescriptor[];
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
	return subLines;
}

interface BuildActionCostLinesOptions {
	costs: Partial<Record<SessionResourceKey, number | undefined>>;
	beforeResources: Partial<Record<SessionResourceKey, number | undefined>>;
	resources: SessionRegistries['resources'];
}

export function buildActionCostLines({
	costs,
	beforeResources,
	resources,
}: BuildActionCostLinesOptions): ActionLogLineDescriptor[] {
	const costLines: ActionLogLineDescriptor[] = [];
	const costKeys = Object.keys(costs) as SessionResourceKey[];
	for (const key of costKeys) {
		const costAmount = costs[key] ?? 0;
		if (!costAmount) {
			continue;
		}
		const info = resources[key];
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
