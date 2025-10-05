import { useCallback, useState } from 'react';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import type { EngineSession } from '@kingdom-builder/engine';
import type { PhaseStep } from './phaseTypes';

interface MainPhaseTrackerOptions {
	session: EngineSession;
	actionCostResource: ResourceKey;
	actionPhaseId: string | undefined;
	setPhaseSteps: React.Dispatch<React.SetStateAction<PhaseStep[]>>;
	setPhaseHistories: React.Dispatch<
		React.SetStateAction<Record<string, PhaseStep[]>>
	>;
	setDisplayPhase: (phase: string) => void;
	getDisplayPhase: () => string;
}

export function useMainPhaseTracker({
	session,
	actionCostResource,
	actionPhaseId,
	setPhaseSteps,
	setPhaseHistories,
	setDisplayPhase,
	getDisplayPhase,
}: MainPhaseTrackerOptions) {
	const [mainApStart, setMainApStart] = useState(0);

	const updateMainPhaseStep = useCallback(
		(apStartOverride?: number) => {
			const snapshot = session.getSnapshot();
			const activePlayer = snapshot.game.players.find(
				(player) => player.id === snapshot.game.activePlayerId,
			);
			if (!activePlayer) {
				return;
			}
			const total = apStartOverride ?? mainApStart;
			const remaining = activePlayer.resources[actionCostResource] ?? 0;
			const spent = total - remaining;
			const resourceInfo = RESOURCES[actionCostResource];
			const costLabel = resourceInfo?.label ?? '';
			const costIcon = resourceInfo?.icon ?? '';
			const costSummary = `${costIcon} ${spent}/${total} spent`;
			const steps: PhaseStep[] = [
				{
					title: `Step 1 - Spend all ${costLabel}`,
					items: [
						{
							text: costSummary,
							done: remaining === 0,
						},
					],
					active: remaining > 0,
				},
			];
			const currentDisplay = getDisplayPhase();
			const currentPhaseId = snapshot.game.currentPhase;
			const viewingActionPhase =
				actionPhaseId !== undefined && currentDisplay === actionPhaseId;
			const shouldUpdateSteps =
				actionPhaseId === undefined || viewingActionPhase;
			if (shouldUpdateSteps) {
				setPhaseSteps(steps);
			}
			if (actionPhaseId) {
				setPhaseHistories((prev) => ({
					...prev,
					[actionPhaseId]: steps,
				}));
				if (viewingActionPhase) {
					setDisplayPhase(actionPhaseId);
				}
			} else if (currentDisplay === currentPhaseId) {
				setDisplayPhase(currentPhaseId);
			}
		},
		[
			actionCostResource,
			actionPhaseId,
			session,
			mainApStart,
			setDisplayPhase,
			setPhaseHistories,
			setPhaseSteps,
			getDisplayPhase,
		],
	);

	return { mainApStart, setMainApStart, updateMainPhaseStep };
}
