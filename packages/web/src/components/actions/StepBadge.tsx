import type { ReactElement } from 'react';

import { type ActionCardVariant } from './ActionCard';
import MultiStepIndicator from './MultiStepIndicator';

export interface StepBadgeProps {
	stepIndex: number | undefined;
	stepCount: number | undefined;
	stepLabel: string | undefined;
	variant: ActionCardVariant;
	multiStep: boolean | undefined;
}

export default function StepBadge({
	stepIndex: _stepIndex,
	stepCount: _stepCount,
	stepLabel,
	variant,
	multiStep,
}: StepBadgeProps): ReactElement | null {
	if (variant === 'back') {
		const label = stepLabel?.trim();
		if (!label) {
			return null;
		}
		return (
			<div className="action-card__badge">
				<span className="action-card__badge-pill">{label}</span>
			</div>
		);
	}
	if (!multiStep || variant !== 'front') {
		return null;
	}
	return (
		<div className="action-card__badge action-card__badge--multi-step pointer-events-none">
			<MultiStepIndicator />
		</div>
	);
}
