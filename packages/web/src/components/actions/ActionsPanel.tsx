import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionMetaCategoryConfig } from '@boardsmith/protocol';
import { type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { hasAiController } from '../../state/sessionAi';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { useResourceMetadata } from '../../contexts/RegistryMetadataContext';
import MetaCategoryPanel from './MetaCategoryPanel';
import ResearchProgressionPanel from './ResearchProgressionPanel';
import {
	INDICATOR_PILL_CLASSES,
	OVERLAY_CLASSES,
	TOGGLE_BUTTON_CLASSES,
} from './actionsPanelStyles';
import type { Action, DisplayPlayer } from './types';
import { normalizeActionFocus } from './types';
import { useActionMetadata } from '../../state/useActionMetadata';
import {
	getActionAvailability,
	type ActionAvailabilityResult,
} from './getActionAvailability';
import { summarizeActionWithInstallation } from './actionSummaryHelpers';

/**
 * Grouped actions by meta-category with visibility info.
 */
interface MetaCategoryGroup {
	metaCategory: ActionMetaCategoryConfig;
	actions: Action[];
	isVisible: boolean;
	hasPool: boolean;
	poolSize: number;
}

interface ActionAvailabilityObserverProps {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
	summary: Summary | undefined;
	onChange: (actionId: string, availability: ActionAvailabilityResult) => void;
}

function ActionAvailabilityObserver({
	action,
	player,
	canInteract,
	summary,
	onChange,
}: ActionAvailabilityObserverProps) {
	const playerId = player.id;
	const metadata = useActionMetadata({
		actionId: action.id,
		playerId,
	});
	const availability = useMemo(
		() =>
			getActionAvailability({
				metadata,
				player,
				canInteract,
				summary,
			}),
		[metadata, player, canInteract, summary],
	);
	useEffect(() => {
		onChange(action.id, availability);
	}, [action.id, availability, onChange]);
	return null;
}

export default function ActionsPanel() {
	const {
		sessionSnapshot,
		selectors,
		translationContext,
		phase,
		resolution,
		sessionId,
	} = useGameEngine();
	const { sessionView } = selectors;
	const resourceMetadata = useResourceMetadata();
	const selectResourceDescriptor = useCallback(
		(resourceKey: string) =>
			resourceMetadata.byId[resourceKey] ??
			resourceMetadata.select(resourceKey),
		[resourceMetadata],
	);

	// Get all meta-categories sorted by order
	const allMetaCategories = useMemo(() => {
		return translationContext.actionMetaCategories
			.list()
			.slice()
			.sort((a, b) => a.order - b.order);
	}, [translationContext.actionMetaCategories]);

	const player = sessionView.active;
	if (!player) {
		return null;
	}
	const opponentView = sessionView.opponent;
	const hasOpponent = Boolean(opponentView);
	const opponent = opponentView ?? player;
	const controlledPlayer = useMemo<DisplayPlayer>(() => {
		const players = sessionSnapshot.game.players;
		const candidateSnapshot =
			players.find((entry) => !hasAiController(sessionId, entry.id)) ??
			players.find(
				(entry) => entry.id === sessionSnapshot.game.activePlayerId,
			) ??
			players.find((entry) => entry.id === sessionSnapshot.game.opponentId) ??
			players[0];
		if (!candidateSnapshot) {
			return player;
		}
		return sessionView.byId.get(candidateSnapshot.id) ?? player;
	}, [
		player,
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.opponentId,
		sessionSnapshot.game.players,
		sessionView.byId,
	]);
	const [viewingOpponent, setViewingOpponent] = useState(false);

	const actionPhaseId = useMemo(
		() =>
			sessionSnapshot.phases.find((phaseDefinition) => phaseDefinition.action)
				?.id,
		[sessionSnapshot.phases],
	);
	const isActionPhase = isActionPhaseActive(phase, actionPhaseId);
	const activePlayerId = sessionSnapshot.game.activePlayerId;
	const isControlledTurn = !hasAiController(sessionId, activePlayerId);

	useEffect(() => {
		if (!isControlledTurn && viewingOpponent) {
			setViewingOpponent(false);
		}
	}, [isControlledTurn, viewingOpponent]);

	useEffect(() => {
		if (!hasOpponent && viewingOpponent) {
			setViewingOpponent(false);
		}
	}, [hasOpponent, viewingOpponent]);

	const selectedPlayer: DisplayPlayer = viewingOpponent
		? opponent
		: controlledPlayer;
	const canInteract =
		isControlledTurn &&
		isActionPhase &&
		!viewingOpponent &&
		!resolution?.requireAcknowledgement;
	const panelDisabled = !canInteract;

	// Get all actions for the selected player
	const actions = useMemo<Action[]>(() => {
		const playerActions =
			sessionView.actionsByPlayer.get(selectedPlayer.id) ?? [];
		const list =
			playerActions.length > 0
				? playerActions
				: sessionView.actionList.filter((actionDefinition) =>
						selectedPlayer.actions.has(actionDefinition.id),
					);
		return list
			.filter(
				(actionDefinition) =>
					!actionDefinition.system ||
					selectedPlayer.actions.has(actionDefinition.id),
			)
			.map((actionDefinition) => {
				const { focus, ...rest } = actionDefinition;
				const normalized = normalizeActionFocus(focus);
				return normalized
					? ({ ...rest, focus: normalized } as Action)
					: (rest as Action);
			});
	}, [sessionView.actionList, sessionView.actionsByPlayer, selectedPlayer]);

	// Build action summaries
	const actionSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		actions.forEach((actionDefinition) => {
			map.set(
				actionDefinition.id,
				summarizeActionWithInstallation(
					actionDefinition.id,
					translationContext,
					actionDefinition.currentTier,
				),
			);
		});
		return map;
	}, [actions, translationContext]);

	// Build meta-category groups with visibility info
	const metaCategoryGroups = useMemo<MetaCategoryGroup[]>(() => {
		return allMetaCategories.map((metaCategory) => {
			// Filter actions belonging to this meta-category
			const categoryActions = actions.filter(
				(action) => action.metaCategory === metaCategory.id,
			);

			// Check visibility based on trigger
			let isVisible: boolean;
			if (metaCategory.visibilityTrigger === 'always') {
				isVisible = true;
			} else {
				// 'resource-touched' - show only if binding resource has been touched
				isVisible =
					selectedPlayer.resourceTouched[metaCategory.bindingResourceId] ??
					false;
			}

			return {
				metaCategory,
				actions: categoryActions,
				isVisible,
				hasPool: Boolean(metaCategory.pool),
				poolSize: metaCategory.pool?.size ?? 0,
			};
		});
	}, [allMetaCategories, actions, selectedPlayer]);

	// Filter to only visible meta-categories
	const visibleMetaCategories = useMemo(
		() => metaCategoryGroups.filter((group) => group.isVisible),
		[metaCategoryGroups],
	);

	// Availability tracking (used by ActionAvailabilityObserver components)
	const [_availabilityMap, setAvailabilityMap] = useState<
		Map<string, ActionAvailabilityResult>
	>(() => new Map());
	useEffect(() => {
		const validIds = new Set(actions.map((entry) => entry.id));
		setAvailabilityMap((previous) => {
			let removed = false;
			previous.forEach((_value, key) => {
				if (!validIds.has(key)) {
					removed = true;
				}
			});
			if (!removed) {
				return previous;
			}
			const next = new Map<string, ActionAvailabilityResult>();
			previous.forEach((value, key) => {
				if (validIds.has(key)) {
					next.set(key, value);
				}
			});
			return next;
		});
	}, [actions]);
	const handleAvailabilityChange = useCallback(
		(actionId: string, availability: ActionAvailabilityResult) => {
			setAvailabilityMap((previous) => {
				const next = new Map(previous);
				next.set(actionId, availability);
				return next;
			});
		},
		[],
	);

	const toggleLabel = viewingOpponent
		? 'Show player actions'
		: 'Show opponent actions';

	return (
		<div className="space-y-6">
			{/* Global status indicators */}
			<div className="flex flex-wrap items-center gap-2">
				{viewingOpponent && (
					<span className={INDICATOR_PILL_CLASSES}>
						<span>Viewing Opponent</span>
					</span>
				)}
				{!isControlledTurn && (
					<span className={INDICATOR_PILL_CLASSES}>
						<span>Opponent Turn</span>
					</span>
				)}
				{!isActionPhase && (
					<span className={INDICATOR_PILL_CLASSES}>
						<span>Not In Main Phase</span>
					</span>
				)}
				{isControlledTurn && hasOpponent && (
					<button
						type="button"
						className={TOGGLE_BUTTON_CLASSES}
						onClick={() => setViewingOpponent((previous) => !previous)}
						aria-label={toggleLabel}
					>
						<span className="margin-top-correction-five">
							{viewingOpponent ? '←' : '→'}
						</span>
					</button>
				)}
			</div>

			{/* Render each visible meta-category panel */}
			{visibleMetaCategories.map((group) => {
				const usesTierProgressionCurve =
					group.metaCategory.pool?.fillMode.type === 'tier-progression-curve';
				const Panel = usesTierProgressionCurve
					? ResearchProgressionPanel
					: MetaCategoryPanel;
				return (
					<div key={group.metaCategory.id} className="relative">
						{panelDisabled && <div aria-hidden className={OVERLAY_CLASSES} />}
						<Panel
							metaCategory={group.metaCategory}
							actions={group.actions}
							summaries={actionSummaries}
							player={selectedPlayer}
							canInteract={canInteract}
							selectResourceDescriptor={selectResourceDescriptor}
							panelDisabled={panelDisabled}
						/>
					</div>
				);
			})}

			{/* Hidden availability observers */}
			{actions.map((actionDefinition) => (
				<ActionAvailabilityObserver
					key={`availability-${actionDefinition.id}`}
					action={actionDefinition}
					player={selectedPlayer}
					canInteract={canInteract}
					summary={actionSummaries.get(actionDefinition.id)}
					onChange={handleAvailabilityChange}
				/>
			))}
		</div>
	);
}
