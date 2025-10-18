import type {
	SessionAdvanceResponse,
	SessionAdvanceResult,
	SessionAdvanceSkipSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { snapshotPlayer } from '../translation';
import { getLegacySessionContext } from './getLegacySessionContext';
import { advanceSessionPhase } from './sessionSdk';
import { getSessionRecord } from './sessionStateStore';
import {
	SessionMirroringError,
	markFatalSessionError,
	isFatalSessionError,
} from './sessionErrors';
import type { SessionRegistries, SessionResourceKey } from './sessionTypes';
import type {
	FormatPhaseResolutionOptions,
	PhaseResolutionFormatResult,
} from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';
import type { PhaseProgressState } from './usePhaseProgress';

type FormatPhaseResolution = (
	options: FormatPhaseResolutionOptions,
) => PhaseResolutionFormatResult;

interface AdvanceToActionPhaseOptions {
	sessionId: string;
	initialSnapshot: SessionSnapshot;
	resourceKeys: SessionResourceKey[];
	mountedRef: React.MutableRefObject<boolean>;
	applyPhaseSnapshot: (
		snapshot: SessionSnapshot,
		overrides?: Partial<PhaseProgressState>,
	) => void;
	refresh: () => void;
	formatPhaseResolution: FormatPhaseResolution;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	registries: Pick<
		SessionRegistries,
		'actions' | 'buildings' | 'developments' | 'populations' | 'resources'
	>;
	onFatalSessionError?: (error: unknown) => void;
}

export async function advanceToActionPhase({
	sessionId,
	initialSnapshot,
	resourceKeys,
	mountedRef,
	applyPhaseSnapshot,
	refresh,
	formatPhaseResolution,
	showResolution,
	registries,
	onFatalSessionError,
}: AdvanceToActionPhaseOptions) {
	try {
		const record = getSessionRecord(sessionId);
		let snapshot = record?.snapshot ?? initialSnapshot;
		if (snapshot.game.conclusion) {
			applyPhaseSnapshot(snapshot, { isAdvancing: false });
			refresh();
			return;
		}
		if (snapshot.phases[snapshot.game.phaseIndex]?.action) {
			if (!mountedRef.current) {
				return;
			}
			applyPhaseSnapshot(snapshot, { isAdvancing: false });
			return;
		}
		applyPhaseSnapshot(snapshot, { isAdvancing: true, canEndTurn: false });
		const aggregatedLines: string[] = [];
		const aggregatedSummaries: string[] = [];
		let aggregatedSource: ShowResolutionOptions['source'];
		let aggregatedActorLabel: string | undefined;
		let aggregatedPlayer: ShowResolutionOptions['player'];
		while (!snapshot.phases[snapshot.game.phaseIndex]?.action) {
			const activePlayerBefore = snapshot.game.players.find(
				(player) => player.id === snapshot.game.activePlayerId,
			);
			if (!activePlayerBefore) {
				break;
			}
			const before = snapshotPlayer(activePlayerBefore);
			const advanceResponse: SessionAdvanceResponse = await advanceSessionPhase(
				{
					sessionId,
				},
				undefined,
				{ skipQueue: true },
			);
			const advanceResult: SessionAdvanceResult = advanceResponse.advance;
			const { player } = advanceResult;
			const skipMetadata: SessionAdvanceSkipSnapshot | undefined =
				advanceResult.skipped;
			const latestRecord = getSessionRecord(sessionId);
			const snapshotAfter = latestRecord?.snapshot ?? advanceResponse.snapshot;
			if (snapshotAfter.game.conclusion) {
				applyPhaseSnapshot(snapshotAfter, { isAdvancing: false });
				refresh();
				return;
			}
			const { diffContext } = getLegacySessionContext({
				snapshot: snapshotAfter,
				ruleSnapshot: snapshotAfter.rules,
				passiveRecords: snapshotAfter.passiveRecords,
				registries,
			});
			const formatted = formatPhaseResolution({
				advance: advanceResult,
				before,
				...(skipMetadata ? {} : { after: snapshotPlayer(player) }),
				diffContext,
				resourceKeys,
			});
			aggregatedSource ??= formatted.source;
			if (formatted.actorLabel && !aggregatedActorLabel) {
				aggregatedActorLabel = formatted.actorLabel;
			}
			if (formatted.lines.length) {
				aggregatedLines.push(...formatted.lines);
			}
			if (formatted.summaries.length) {
				aggregatedSummaries.push(...formatted.summaries);
			}
			if (!aggregatedPlayer && player) {
				aggregatedPlayer = player;
			}
			applyPhaseSnapshot(snapshotAfter, {
				isAdvancing: true,
				canEndTurn: false,
			});
			snapshot = snapshotAfter;
		}
		if (aggregatedLines.length) {
			const resolutionOptions: ShowResolutionOptions = {
				lines: aggregatedLines,
				summaries: aggregatedSummaries,
				source: aggregatedSource ?? 'phase',
				requireAcknowledgement: false,
				...(aggregatedPlayer ? { player: aggregatedPlayer } : {}),
				...(aggregatedActorLabel ? { actorLabel: aggregatedActorLabel } : {}),
			};
			await showResolution(resolutionOptions);
			if (!mountedRef.current) {
				return;
			}
		}
		if (!mountedRef.current) {
			return;
		}
		const refreshedRecord = getSessionRecord(sessionId);
		const refreshed = refreshedRecord?.snapshot ?? snapshot;
		if (!mountedRef.current) {
			return;
		}
		applyPhaseSnapshot(refreshed, { isAdvancing: false });
		refresh();
	} catch (error) {
		if (error instanceof SessionMirroringError) {
			if (isFatalSessionError(error)) {
				return;
			}
			if (onFatalSessionError) {
				markFatalSessionError(error);
				onFatalSessionError(error);
				return;
			}
		}
		throw error;
	}
}
