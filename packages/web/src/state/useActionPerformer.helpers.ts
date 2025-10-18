import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { ActionTrace } from '@kingdom-builder/protocol/actions';
import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { diffStepSnapshots, snapshotPlayer } from '../translation';
import type { TranslationContext } from '../translation/context';
import type { TranslationDiffContext } from '../translation';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';
import { formatActionLogLines } from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import type { Action } from './actionTypes';
import type { ShowResolutionOptions } from './useActionResolution';
import type { PhaseProgressState } from './usePhaseProgress';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';

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

interface HandleMissingActionDefinitionOptions {
	action: Action;
	player: Pick<SessionPlayerStateSnapshot, 'id' | 'name' | 'resources'>;
	snapshot: SessionSnapshot;
	actionCostResource: SessionResourceKey;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	syncPhaseState: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	refresh: () => void;
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
	mountedRef: { current: boolean };
	endTurn: () => Promise<void>;
}

export async function handleMissingActionDefinition({
	action,
	player,
	snapshot,
	actionCostResource,
	showResolution,
	syncPhaseState,
	refresh,
	addLog,
	mountedRef,
	endTurn,
}: HandleMissingActionDefinitionOptions) {
	console.warn(
		`Missing action definition for ${action.id}; using fallback resolution logs.`,
	);
	const fallbackHeadline = `Played ${action.name}`;
	const fallbackChange =
		'No detailed log available because the action definition was missing.';
	const fallbackMessages: ActionLogLineDescriptor[] = [
		{
			text: fallbackHeadline,
			depth: 0,
			kind: 'headline',
		},
	];
	const logLines = formatActionLogLines(fallbackMessages, [fallbackChange]);
	const actionMeta = buildResolutionActionMeta(
		action,
		undefined,
		fallbackHeadline,
	);
	const resolutionSource = {
		kind: 'action' as const,
		label: 'Action',
		id: actionMeta.id,
		name: actionMeta.name,
		icon: actionMeta.icon ?? '',
	} satisfies ShowResolutionOptions['source'];
	const resolutionPlayer = {
		id: player.id,
		name: player.name,
	} satisfies ShowResolutionOptions['player'];
	syncPhaseState(snapshot);
	refresh();
	let shouldAddLog = true;
	try {
		await showResolution({
			action: actionMeta,
			lines: logLines,
			player: resolutionPlayer,
			summaries: [],
			source: resolutionSource,
			actorLabel: 'Played by',
		});
	} catch (error) {
		void error;
		addLog(logLines, resolutionPlayer);
		shouldAddLog = false;
	}
	if (shouldAddLog) {
		addLog(logLines, resolutionPlayer);
	}
	if (!mountedRef.current) {
		return;
	}
	if (snapshot.game.conclusion) {
		return;
	}
	if (
		snapshot.game.devMode &&
		(player.resources[actionCostResource] ?? 0) <= 0
	) {
		await endTurn();
	}
}

interface PresentResolutionOptions {
	action: ReturnType<typeof buildResolutionActionMeta>;
	logLines: string[];
	summaries: string[];
	player: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
}

export async function presentResolutionOrLog({
	action,
	logLines,
	summaries,
	player,
	showResolution,
	addLog,
}: PresentResolutionOptions) {
	const source = {
		kind: 'action' as const,
		label: 'Action',
		id: action.id,
		name: action.name,
		icon: action.icon ?? '',
	} satisfies ShowResolutionOptions['source'];
	const playerIdentity = {
		id: player.id,
		name: player.name,
	} satisfies ShowResolutionOptions['player'];
	try {
		await showResolution({
			action,
			lines: logLines,
			player: playerIdentity,
			summaries,
			source,
			actorLabel: 'Played by',
		});
	} catch (error) {
		void error;
		addLog(logLines, playerIdentity);
	}
}
