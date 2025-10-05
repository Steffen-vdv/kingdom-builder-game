import { useCallback, useState } from 'react';
import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import type { PhaseStep } from './phaseTypes';

interface MainPhaseTrackerOptions {
	ctx: EngineContext;
	actionCostResource: ResourceKey;
	actionPhaseId: string | undefined;
	setPhaseSteps: React.Dispatch<React.SetStateAction<PhaseStep[]>>;
	setPhaseHistories: React.Dispatch<
		React.SetStateAction<Record<string, PhaseStep[]>>
	>;
	setDisplayPhase: (phase: string) => void;
}

export function useMainPhaseTracker({
	ctx,
	actionCostResource,
	actionPhaseId,
	setPhaseSteps,
	setPhaseHistories,
	setDisplayPhase,
}: MainPhaseTrackerOptions) {
	const [mainApStart, setMainApStart] = useState(0);

	const updateMainPhaseStep = useCallback(
		(apStartOverride?: number) => {
			const total = apStartOverride ?? mainApStart;
			const remaining = ctx.activePlayer.resources[actionCostResource] ?? 0;
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
			if (actionPhaseId) {
				setPhaseHistories((prev) => ({
					...prev,
					[actionPhaseId]: steps,
				}));
				setDisplayPhase(actionPhaseId);
			} else {
				setDisplayPhase(ctx.game.currentPhase);
			}
		},
		[
			actionCostResource,
			actionPhaseId,
			ctx,
			mainApStart,
			setDisplayPhase,
			setPhaseHistories,
			setPhaseSteps,
		],
	);

	return { mainApStart, setMainApStart, updateMainPhaseStep };
}
