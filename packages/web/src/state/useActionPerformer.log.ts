import {
	resolveActionEffects,
	type ActionParams,
	type ActionTrace,
	type ResolvedActionEffects,
} from '@kingdom-builder/engine';
import {
	ActionId,
	RESOURCES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import {
	diffStepSnapshots,
	logContent,
	snapshotPlayer,
	type PlayerSnapshot,
	type TranslationContext,
} from '../translation';
import { type TranslationDiffContext } from '../translation/log';
import {
	formatActionLogLines,
	formatDevelopActionLogLines,
} from './actionLogFormat';
import type { Action } from './actionTypes';

interface BuildLogOptions {
	action: Action;
	params: ActionParams<string> | undefined;
	translation: TranslationContext;
	diffContext: TranslationDiffContext;
	before: PlayerSnapshot;
	after: PlayerSnapshot;
	costs: Record<string, number | undefined>;
	resourceKeys: ResourceKey[];
	step: ResolvedActionEffects | undefined;
	traces: ActionTrace[];
}

interface BuildLogResult {
	logLines: string[];
	filtered: string[];
	logHeadline: string;
}

function normalizeChange(line: string): string {
	const trimmed = line.trim();
	if (!trimmed) {
		return '';
	}
	return (trimmed.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();
}

export function buildActionLogResult({
	action,
	params,
	translation,
	diffContext,
	before,
	after,
	costs,
	resourceKeys,
	step,
	traces,
}: BuildLogOptions): BuildLogResult {
	const messages = logContent('action', action.id, translation, params);
	const logHeadline = messages[0] ?? '';
	const stepEffects = step ? { effects: step.effects } : undefined;
	const changes = diffStepSnapshots(
		before,
		after,
		stepEffects,
		diffContext,
		resourceKeys,
	);
	const costLines: string[] = [];
	for (const key of Object.keys(costs) as (keyof typeof RESOURCES)[]) {
		const amount = costs[key] ?? 0;
		if (!amount) {
			continue;
		}
		const info = RESOURCES[key];
		const icon = info?.icon ? `${info.icon} ` : '';
		const label = info?.label ?? key;
		const beforeAmount = before.resources[key] ?? 0;
		const afterAmount = beforeAmount - amount;
		costLines.push(
			`    ${icon}${label} -${amount} (${beforeAmount}→${afterAmount})`,
		);
	}
	if (costLines.length) {
		messages.splice(1, 0, '  💲 Action cost', ...costLines);
	}
	const subLines: string[] = [];
	for (const trace of traces) {
		const subAction = translation.actions.get(trace.id);
		if (!subAction) {
			continue;
		}
		const subStep = resolveActionEffects(subAction);
		const subStepEffects = { effects: subStep.effects };
		const subResolved = diffStepSnapshots(
			snapshotPlayer(trace.before),
			snapshotPlayer(trace.after),
			subStepEffects,
			diffContext,
			resourceKeys,
		);
		if (!subResolved.length) {
			continue;
		}
		subLines.push(...subResolved);
		const icon = subAction.icon || '';
		const name = subAction.name;
		const line = `  ${icon} ${name}`;
		const index = messages.indexOf(line);
		if (index !== -1) {
			messages.splice(
				index + 1,
				0,
				...subResolved.map((entry) => `    ${entry}`),
			);
		}
	}
	const messagePrefixes = new Set(
		messages.map(normalizeChange).filter((entry) => entry.length > 0),
	);
	const subPrefixes = new Set(subLines.map(normalizeChange));
	const costLabels = new Set(Object.keys(costs) as (keyof typeof RESOURCES)[]);
	const filtered = changes.filter((line) => {
		const normalizedLine = normalizeChange(line);
		if (messagePrefixes.has(normalizedLine)) {
			return false;
		}
		if (subPrefixes.has(normalizedLine)) {
			return false;
		}
		for (const key of costLabels) {
			const info = RESOURCES[key];
			const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
			if (line.startsWith(prefix)) {
				return false;
			}
		}
		return true;
	});
	const formatter =
		action.id === ActionId.develop
			? formatDevelopActionLogLines
			: formatActionLogLines;
	const logLines = formatter(messages, filtered);
	return { logLines, filtered, logHeadline };
}
