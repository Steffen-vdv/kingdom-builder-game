import {
	useCallback,
	useState,
	type Dispatch,
	type MutableRefObject,
	type SetStateAction,
} from 'react';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import type { EngineSession } from '@kingdom-builder/engine';
import type { PhaseStep } from './phaseTypes';

interface MainPhaseTrackerOptions {
	session: EngineSession;
	actionCostResource: ResourceKey;
	actionPhaseId: string | undefined;
	setPhaseSteps: Dispatch<SetStateAction<PhaseStep[]>>;
	setPhaseHistories: Dispatch<SetStateAction<Record<string, PhaseStep[]>>>;
	setDisplayPhase: (phase: string) => void;
	displayPhaseRef: MutableRefObject<string>;
}

export function useMainPhaseTracker({
	session,
	actionCostResource,
	actionPhaseId,
	setPhaseSteps,
	setPhaseHistories,
	setDisplayPhase,
	displayPhaseRef,
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
			setPhaseSteps(steps);
			const currentPhaseId = snapshot.game.currentPhase;
			if (actionPhaseId) {
				setPhaseHistories((prev) => ({
					...prev,
					[actionPhaseId]: steps,
				}));
				if (displayPhaseRef.current === actionPhaseId) {
					setDisplayPhase(actionPhaseId);
				}
			} else if (displayPhaseRef.current === currentPhaseId) {
				setDisplayPhase(currentPhaseId);
			}
		},
		[
			actionCostResource,
			actionPhaseId,
			session,
			mainApStart,
			setDisplayPhase,
			displayPhaseRef,
			setPhaseHistories,
			setPhaseSteps,
		],
	);

	return { mainApStart, setMainApStart, updateMainPhaseStep };
}
