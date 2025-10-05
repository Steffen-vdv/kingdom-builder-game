import React from 'react';

import { type ActionCardVariant } from './ActionCard';

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
}: StepBadgeProps): JSX.Element | null {
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
		<div className="action-card__badge">
			<span
				className="action-card__multi-step"
				role="img"
				aria-label="Multi-step action"
				title="Multi-step action"
			>
				<svg
					className="action-card__multi-step-icon"
					viewBox="0 0 16 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M3.25 12.75h3.5v-3.5h3.5V5.75H13.5"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M11.25 3.75L13.75 6l-2.5 2.25"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</span>
		</div>
	);
}
