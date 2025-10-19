import type {
	SessionAdvanceResponse,
	SessionAdvanceResult,
	SessionAdvanceSkipSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { snapshotPlayer } from '../translation';
import { createSessionTranslationContext } from './createSessionTranslationContext';
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
import type {
	ResolutionSource,
	ShowResolutionOptions,
} from './useActionResolution';

function isPhaseSourceDetail(
	source: ResolutionSource,
): source is Extract<ResolutionSource, { kind: 'phase' }> {
	return typeof source !== 'string' && source.kind === 'phase';
}
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
		let lastPhaseSourceId: string | null = null;
		let lastPhaseHeaderLogged = false;
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
			const { diffContext } = createSessionTranslationContext({
				snapshot: snapshotAfter,
				ruleSnapshot: snapshotAfter.rules,
				passiveRecords: snapshotAfter.passiveRecords,
				registries,
			});
			const phaseDefinitionAfter = snapshotAfter.phases.find(
				(phase) => phase.id === advanceResult.phase,
			);
			const phaseDefinitionBefore = snapshot.phases.find(
				(phase) => phase.id === advanceResult.phase,
			);
			const phaseDefinition = phaseDefinitionAfter ?? phaseDefinitionBefore;
			const stepDefinitionAfter = phaseDefinitionAfter?.steps?.find(
				(step) => step.id === advanceResult.step,
			);
			const stepDefinitionBefore = phaseDefinitionBefore?.steps?.find(
				(step) => step.id === advanceResult.step,
			);
			const stepDefinition = stepDefinitionAfter ?? stepDefinitionBefore;
			const formatted = formatPhaseResolution({
				advance: advanceResult,
				before,
				...(skipMetadata ? {} : { after: snapshotPlayer(player) }),
				diffContext,
				resourceKeys,
				...(phaseDefinition ? { phaseDefinition } : {}),
				...(stepDefinition ? { stepDefinition } : {}),
			});
			let outputLines = formatted.lines;
			if (isPhaseSourceDetail(formatted.source)) {
				const heading = formatted.source.label;
				const phaseKey = formatted.source.id ?? heading;
				const hasHeading = outputLines.length > 0 && outputLines[0] === heading;
				if (hasHeading) {
					if (lastPhaseHeaderLogged && phaseKey === lastPhaseSourceId) {
						outputLines = outputLines.slice(1);
					} else {
						lastPhaseSourceId = phaseKey;
						lastPhaseHeaderLogged = true;
					}
				} else {
					lastPhaseSourceId = phaseKey;
					lastPhaseHeaderLogged = false;
				}
			} else {
				lastPhaseSourceId = null;
				lastPhaseHeaderLogged = false;
			}
			const resolutionOptions: ShowResolutionOptions = {
				lines: outputLines,
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
