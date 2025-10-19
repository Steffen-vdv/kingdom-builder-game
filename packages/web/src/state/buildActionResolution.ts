import { resolveActionEffects } from '@kingdom-builder/protocol';
import type {
	ActionParametersPayload,
	ActionTrace,
} from '@kingdom-builder/protocol/actions';
import type { ActionConfig } from '@kingdom-builder/protocol';
import {
	diffStepSnapshots,
	logContent,
	snapshotPlayer,
	type PlayerSnapshot,
	type TranslationDiffContext,
} from '../translation';
import type { TranslationContext } from '../translation/context';
import {
	buildActionLogTimeline,
	buildDevelopActionLogTimeline,
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import { LOG_KEYWORDS } from '../translation/log/logMessages';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';

/**
 * buildActionResolution centralizes the legacy action resolution formatting
 * pipeline used by the session UI. The helper accepts the resolved action,
 * translation context, traces, and resource metadata then produces timeline and
 * summary artefacts identical to the output previously assembled inside
 * useActionPerformer. Consumers (including the AI runner task) can call this
 * helper to format action resolutions without duplicating the sequencing logic.
 */
export interface BuildActionResolutionOptions {
	actionId: string;
	actionDefinition: ActionConfig;
	params?: ActionParametersPayload;
	traces: readonly ActionTrace[];
	costs: Partial<Record<SessionResourceKey, number | undefined>>;
	before: PlayerSnapshot;
	after: PlayerSnapshot;
	translationContext: TranslationContext;
	diffContext: TranslationDiffContext;
	resourceKeys: readonly SessionResourceKey[];
	resources: SessionRegistries['resources'];
}

export interface BuildActionResolutionResult {
	messages: ActionLogLineDescriptor[];
	timeline: ActionLogLineDescriptor[];
	logLines: string[];
	summaries: string[];
	headline?: string;
}

export function ensureTimelineLines(
	entries: readonly (string | ActionLogLineDescriptor)[],
): ActionLogLineDescriptor[] {
	const lines: ActionLogLineDescriptor[] = [];
	for (const [index, entry] of entries.entries()) {
		if (typeof entry === 'string') {
			const text = entry.trim();
			if (!text) {
				continue;
			}
			lines.push({
				text,
				depth: index === 0 ? 0 : 1,
				kind: index === 0 ? 'headline' : 'effect',
			});
			continue;
		}
		lines.push(entry);
	}
	return lines;
}

interface AppendSubActionChangesOptions {
	traces: readonly ActionTrace[];
	context: TranslationContext;
	diffContext: TranslationDiffContext;
	resourceKeys: readonly SessionResourceKey[];
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
		if (!subStep) {
			continue;
		}
		const subResolved = resolveActionEffects(subStep);
		const subChanges = diffStepSnapshots(
			snapshotPlayer(trace.before),
			snapshotPlayer(trace.after),
			subResolved,
			diffContext,
			Array.from(resourceKeys),
		);
		if (!subChanges.length) {
			continue;
		}
		subLines.push(...subChanges);
		const icon = subStep.icon ?? '';
		const name = subStep.name ?? trace.id;
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
	const costKeys = Object.keys(costs);
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
	changes: readonly string[];
	messages: readonly ActionLogLineDescriptor[];
	subLines: readonly string[];
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

export function buildActionResolution({
	actionId,
	actionDefinition,
	params,
	traces,
	costs,
	before,
	after,
	translationContext,
	diffContext,
	resourceKeys,
	resources,
}: BuildActionResolutionOptions): BuildActionResolutionResult {
	const stepEffects = resolveActionEffects(actionDefinition, params);
	const changes = diffStepSnapshots(
		before,
		after,
		stepEffects,
		diffContext,
		Array.from(resourceKeys),
	);
	const rawMessages = logContent(
		'action',
		actionId,
		translationContext,
		params,
	);
	const messages = ensureTimelineLines(rawMessages);
	const costLines = buildActionCostLines({
		costs,
		beforeResources: before.resources,
		resources,
	});
	if (costLines.length) {
		const header: ActionLogLineDescriptor = {
			text: '💲 Action cost',
			depth: 1,
			kind: 'cost',
		};
		messages.splice(1, 0, header, ...costLines);
	}
	const subLines = appendSubActionChanges({
		traces,
		context: translationContext,
		diffContext,
		resourceKeys,
		messages,
	});
	const summaries = filterActionDiffChanges({
		changes,
		messages,
		subLines,
	});
	const useDevelopFormatter = summaries.some((line) =>
		line.startsWith(LOG_KEYWORDS.developed),
	);
	const buildTimeline = useDevelopFormatter
		? buildDevelopActionLogTimeline
		: buildActionLogTimeline;
	const formatLines = useDevelopFormatter
		? formatDevelopActionLogLines
		: formatActionLogLines;
	const timeline = buildTimeline(messages, summaries);
	const logLines = formatLines(messages, summaries);
	const headline = messages[0]?.text;
	const result: BuildActionResolutionResult = {
		messages,
		timeline,
		logLines,
		summaries,
	};
	if (headline !== undefined) {
		result.headline = headline;
	}
	return result;
}
