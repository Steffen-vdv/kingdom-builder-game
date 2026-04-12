import React, { useCallback, useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import { useAdvanceAction } from '../../state/useAdvanceAction';
import type { ActionResolution } from '../../state/useActionResolution';
import Button from '../common/Button';
import {
	PANEL_CLASSES,
	HEADER_CLASSES,
	TURN_SUMMARY_CLASSES,
	TURN_BADGE_CLASSES,
	PLAYER_DETAILS_CLASSES,
	PLAYER_LABEL_CLASSES,
	PLAYER_NAME_CLASSES,
	PHASE_SECTION_CLASSES,
	PHASE_LIST_CLASSES,
	PHASE_LIST_ITEM_CLASSES,
	PHASE_LIST_ITEM_CONTENT_CLASSES,
	PHASE_INDEX_WRAPPER_CLASSES,
	PHASE_INDEX_HIGHLIGHT_CLASSES,
	PHASE_INDEX_TEXT_CLASSES,
	PHASE_ICON_CLASSES,
	PHASE_LABEL_CLASSES,
} from './phasePanelStyles';

function normalizePhaseKey(id?: string, label?: string) {
	const trimmedId = id?.trim();
	if (trimmedId && trimmedId.length > 0) {
		return trimmedId;
	}
	const trimmedLabel = label?.trim();
	if (trimmedLabel && trimmedLabel.length > 0) {
		return trimmedLabel;
	}
	return null;
}

interface PhaseSummary {
	id: string;
	label: string;
	icon: string;
	historyKey: string;
	isActionPhase: boolean;
}

export default function PhasePanel() {
	const {
		sessionSnapshot,
		selectors,
		ruleSnapshot,
		phase,
		resolution,
		log,
		handleHoverCard,
		clearHoverCard,
	} = useGameEngine();
	const { mode: advanceMode, advance } = useAdvanceAction();
	const { sessionView } = selectors;
	const phases = useMemo<PhaseSummary[]>(
		() =>
			sessionSnapshot.phases.map((phaseDefinition) => {
				const trimmedLabel = phaseDefinition.label?.trim();
				const resolvedLabel =
					trimmedLabel && trimmedLabel.length > 0
						? trimmedLabel
						: phaseDefinition.id;
				const historyKey =
					normalizePhaseKey(phaseDefinition.id, phaseDefinition.label) ??
					phaseDefinition.id;
				return {
					id: phaseDefinition.id,
					label: resolvedLabel,
					icon: phaseDefinition.icon?.trim() ?? '',
					historyKey,
					isActionPhase: Boolean(phaseDefinition.action),
				};
			}),
		[sessionSnapshot.phases],
	);
	const turnLimit = useMemo(() => {
		for (const condition of ruleSnapshot.winConditions) {
			if (condition.trigger.type === 'turn-limit') {
				return condition.trigger.maxTurns;
			}
		}
		return null;
	}, [ruleSnapshot.winConditions]);
	const phaseHistory = useMemo(() => {
		const byPhase = new Map<string, ActionResolution>();
		const byPlayer = new Map<string, ActionResolution>();
		for (let index = log.length - 1; index >= 0; index -= 1) {
			const entry = log[index];
			if (!entry) {
				continue;
			}
			const source = entry.resolution.source;
			if (!source || typeof source !== 'object') {
				continue;
			}
			if (source.kind !== 'phase') {
				continue;
			}
			const historyKey = normalizePhaseKey(source.id, source.label);
			if (!historyKey) {
				continue;
			}
			if (!byPhase.has(historyKey)) {
				byPhase.set(historyKey, entry.resolution);
			}
			const playerKey = `${entry.playerId}::${historyKey}`;
			if (!byPlayer.has(playerKey)) {
				byPlayer.set(playerKey, entry.resolution);
			}
		}
		return { byPhase, byPlayer };
	}, [log]);
	const currentPhaseLabel = useMemo(
		() =>
			phases.find(
				(phaseDefinition) => phaseDefinition.id === phase.currentPhaseId,
			)?.label ?? phase.currentPhaseId,
		[phases, phase.currentPhaseId],
	);
	const activePlayerSnapshot = useMemo(() => {
		if (phase.activePlayerId) {
			return sessionSnapshot.game.players.find(
				(player) => player.id === phase.activePlayerId,
			);
		}
		return sessionSnapshot.game.players[0];
	}, [phase.activePlayerId, sessionSnapshot.game.players]);
	const activePlayerId = activePlayerSnapshot?.id ?? null;
	const activePlayerName =
		phase.activePlayerName ??
		sessionView.active?.name ??
		activePlayerSnapshot?.name ??
		'Player';
	const shouldHideControls = Boolean(resolution?.requireAcknowledgement);
	const shouldSuppressHoverCards = useMemo(
		() =>
			Boolean(
				resolution &&
				(!resolution.requireAcknowledgement || !resolution.isComplete),
			),
		[resolution],
	);
	const showPhaseHistory = useCallback(
		(phaseSummary: PhaseSummary, resolution: ActionResolution | null) => {
			if (phaseSummary.isActionPhase || !resolution) {
				clearHoverCard();
				return;
			}
			const baseLabel = phaseSummary.label;
			const resolutionTitle = `${baseLabel} resolution`;
			handleHoverCard({
				title: resolutionTitle,
				resolutionTitle,
				resolution,
				effects: [],
				requirements: [],
			});
		},
		[clearHoverCard, handleHoverCard],
	);
	const hidePhaseHistory = useCallback(() => {
		clearHoverCard();
	}, [clearHoverCard]);

	// Show "Let's Go" button when in start mode and controls aren't hidden
	const shouldShowManualStartButton =
		advanceMode === 'start' && !shouldHideControls;
	return (
		<section className={PANEL_CLASSES}>
			<header className={HEADER_CLASSES}>
				<div className={TURN_SUMMARY_CLASSES}>
					<span className={TURN_BADGE_CLASSES}>
						<span className="text-[0.6rem] uppercase tracking-[0.45em]">
							Turn
						</span>
						<span className="text-base tracking-[0.15em]">
							{turnLimit !== null
								? `${phase.turnNumber} / ${turnLimit}`
								: phase.turnNumber}
						</span>
					</span>
					<span className="sr-only">Active player:</span>
					<div className={PLAYER_DETAILS_CLASSES}>
						<span className={PLAYER_LABEL_CLASSES}>Active Player</span>
						<span className={PLAYER_NAME_CLASSES}>{activePlayerName}</span>
					</div>
				</div>
				<span className="sr-only" role="status" aria-live="polite">
					Current phase: {currentPhaseLabel}
				</span>
			</header>
			<div className={PHASE_SECTION_CLASSES}>
				<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
					Phases
				</p>
				<ul className={PHASE_LIST_CLASSES}>
					{phases.map((phaseDefinition, phaseIndex) => {
						const historyKey = phaseDefinition.historyKey;
						const playerKey = activePlayerId
							? `${activePlayerId}::${historyKey}`
							: null;
						const phaseResolution =
							(playerKey ? phaseHistory.byPlayer.get(playerKey) : undefined) ??
							phaseHistory.byPhase.get(historyKey) ??
							null;
						const isActive = phaseDefinition.id === phase.currentPhaseId;
						const shouldShowHoverIndicator =
							Boolean(phaseResolution) &&
							!phaseDefinition.isActionPhase &&
							!shouldSuppressHoverCards;
						const resolvedPhaseListItemClassName = [
							PHASE_LIST_ITEM_CLASSES,
							shouldShowHoverIndicator ? 'hoverable cursor-help' : '',
						]
							.filter(Boolean)
							.join(' ');
						const handlePhaseMouseEnter = shouldShowHoverIndicator
							? () => showPhaseHistory(phaseDefinition, phaseResolution)
							: hidePhaseHistory;
						return (
							<li
								key={phaseDefinition.id}
								className={resolvedPhaseListItemClassName}
								data-active={isActive ? 'true' : 'false'}
								aria-current={isActive ? 'step' : undefined}
								onMouseEnter={handlePhaseMouseEnter}
								onMouseLeave={hidePhaseHistory}
							>
								<span className={PHASE_LIST_ITEM_CONTENT_CLASSES}>
									<span
										className={PHASE_INDEX_WRAPPER_CLASSES}
										data-active={isActive ? 'true' : 'false'}
										aria-hidden="true"
									>
										<span
											className={PHASE_INDEX_HIGHLIGHT_CLASSES}
											data-active={isActive ? 'true' : 'false'}
											aria-hidden="true"
										/>
										<span
											className={PHASE_INDEX_TEXT_CLASSES}
											data-active={isActive ? 'true' : 'false'}
										>
											{String(phaseIndex + 1).padStart(2, '0')}
										</span>
									</span>
									<span className={PHASE_ICON_CLASSES} aria-hidden="true">
										{phaseDefinition.icon || '⚠️'}
									</span>
									<span className={PHASE_LABEL_CLASSES}>
										{phaseDefinition.label}
									</span>
								</span>
							</li>
						);
					})}
				</ul>
			</div>
			{shouldShowManualStartButton ? (
				<div className="flex justify-end pt-2">
					<Button variant="success" onClick={advance} icon="🚀">
						Let's go!
					</Button>
				</div>
			) : null}
		</section>
	);
}
