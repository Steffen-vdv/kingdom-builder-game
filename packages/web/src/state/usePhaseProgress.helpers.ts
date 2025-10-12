import type {
	SessionAdvanceResponse,
	SessionAdvanceResult,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { snapshotPlayer } from '../translation';
import { getLegacySessionContext } from './getLegacySessionContext';
import {
	advanceSessionPhase,
	SessionMirroringError,
	markFatalSessionError,
	isFatalSessionError,
} from './sessionSdk';
import type {
	LegacySession,
	SessionRegistries,
	SessionResourceKey,
} from './sessionTypes';
import type {
	FormatPhaseResolutionOptions,
	PhaseResolutionFormatResult,
} from './formatPhaseResolution';
import type { ShowResolutionOptions } from './useActionResolution';
import type { EngineAdvanceResult } from '@kingdom-builder/engine';
import type { PhaseProgressState } from './usePhaseProgress';

type FormatPhaseResolution = (
	options: FormatPhaseResolutionOptions,
) => PhaseResolutionFormatResult;

interface AdvanceToActionPhaseOptions {
	session: LegacySession;
	sessionId: string;
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
	session,
	sessionId,
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
		let snapshot = session.getSnapshot();
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
			);
			const { advance } = advanceResponse;
			const { phase, step, player, effects, skipped }: SessionAdvanceResult =
				advance;
			const snapshotAfter = advanceResponse.snapshot;
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
				advance: {
					phase,
					step,
					effects,
					player,
					...(skipped ? { skipped } : {}),
				} as EngineAdvanceResult,
				before,
				after: snapshotPlayer(player),
				diffContext,
				resourceKeys,
			});
			const resolutionOptions: ShowResolutionOptions = {
				lines: formatted.lines,
				summaries: formatted.summaries,
				source: formatted.source,
				player,
				requireAcknowledgement: false,
				...(formatted.actorLabel ? { actorLabel: formatted.actorLabel } : {}),
			};
			await showResolution(resolutionOptions);
			if (!mountedRef.current) {
				return;
			}
			applyPhaseSnapshot(snapshotAfter, {
				isAdvancing: true,
				canEndTurn: false,
			});
			snapshot = snapshotAfter;
		}
		if (!mountedRef.current) {
			return;
		}
		const refreshed = session.getSnapshot();
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
