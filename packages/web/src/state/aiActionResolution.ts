import {
	resolveActionEffects,
	type ActionParametersPayload,
	type SessionAiActionLogEntry,
	type SessionPlayerStateSnapshot,
	type SessionSnapshot,
} from '@kingdom-builder/protocol';
import { diffStepSnapshots, logContent, snapshotPlayer } from '../translation';
import { createSessionTranslationContext } from './createSessionTranslationContext';
import {
	ensureTimelineLines,
	appendSubActionChanges,
	filterActionDiffChanges,
	presentResolutionOrLog,
} from './useActionPerformer.helpers';
import {
	buildActionLogTimeline,
	formatActionLogLines,
} from './actionLogFormat';
import { buildResolutionActionMeta } from './deriveResolutionActionName';
import type { ShowResolutionOptions } from './useActionResolution';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type { Action } from './actionTypes';

interface PresentAiActionLogsOptions {
	logs: SessionAiActionLogEntry[];
	snapshot: SessionSnapshot;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'resources' | 'populations'
	>;
	resourceKeys: SessionResourceKey[];
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	addLog: (
		entry: string | string[],
		player?: Pick<SessionPlayerStateSnapshot, 'id' | 'name'>,
	) => void;
}

export async function presentAiActionLogs({
	logs,
	snapshot,
	registries,
	resourceKeys,
	showResolution,
	addLog,
}: PresentAiActionLogsOptions): Promise<void> {
	if (!logs.length) {
		return;
	}
	const { translationContext, diffContext } = createSessionTranslationContext({
		snapshot,
		ruleSnapshot: snapshot.rules,
		passiveRecords: snapshot.passiveRecords,
		registries,
	});
	const sortedLogs = [...logs].sort((a, b) => {
		if (a.turn !== b.turn) {
			return a.turn - b.turn;
		}
		return a.sequence - b.sequence;
	});
	for (const entry of sortedLogs) {
		if (entry.traces.length === 0) {
			continue;
		}
		const playerSnapshot = snapshot.game.players.find((player) => {
			return player.id === entry.playerId;
		});
		const resolutionPlayer = playerSnapshot
			? { id: playerSnapshot.id, name: playerSnapshot.name }
			: { id: entry.playerId, name: entry.playerId };
		const actionDefinition = translationContext.actions.get(entry.actionId);
		if (!actionDefinition) {
			const headline = `Played ${entry.actionId}`;
			const lines = [headline];
			await showResolution({
				lines,
				player: resolutionPlayer,
				summaries: lines,
				source: {
					kind: 'action',
					label: 'Action',
					id: entry.actionId,
					name: entry.actionId,
				},
				actorLabel: 'Played by',
			});
			addLog(lines, resolutionPlayer);
			continue;
		}
		const action: Action = {
			id: actionDefinition.id,
			name: actionDefinition.name,
		};
		if (actionDefinition.system !== undefined) {
			action.system = actionDefinition.system;
		}
		const params: ActionParametersPayload | undefined = entry.params;
		const resolved = resolveActionEffects(actionDefinition, params);
		const rawMessages = logContent(
			'action',
			actionDefinition.id,
			translationContext,
			params,
		);
		const messages = ensureTimelineLines(rawMessages);
		const headline = messages[0]?.text;
		const terminalTrace = entry.traces[entry.traces.length - 1];
		if (!terminalTrace) {
			continue;
		}
		const beforeSnapshot = snapshotPlayer(terminalTrace.before);
		const afterSnapshot = snapshotPlayer(terminalTrace.after);
		const changes = diffStepSnapshots(
			beforeSnapshot,
			afterSnapshot,
			resolved,
			diffContext,
			resourceKeys,
		);
		const subLines = appendSubActionChanges({
			traces: entry.traces,
			context: translationContext,
			diffContext,
			resourceKeys,
			messages,
		});
		const filtered = filterActionDiffChanges({
			changes,
			messages,
			subLines,
		});
		const timeline = buildActionLogTimeline(messages, filtered);
		const logLines = formatActionLogLines(messages, filtered);
		const actionMeta = buildResolutionActionMeta(
			action,
			actionDefinition,
			headline,
		);
		const shouldAddLog = await presentResolutionOrLog({
			action: actionMeta,
			logLines,
			summaries: filtered,
			player: resolutionPlayer,
			showResolution,
			addLog,
			timeline,
		});
		if (shouldAddLog) {
			addLog(logLines, resolutionPlayer);
		}
	}
}
