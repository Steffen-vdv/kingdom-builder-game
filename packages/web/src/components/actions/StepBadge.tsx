import type { ReactElement } from 'react';

import { type ActionCardVariant } from './ActionCard';

export interface StepBadgeProps {
	stepLabel: string | undefined;
	variant: ActionCardVariant;
}

export interface MultiStepIndicatorProps {
	className?: string | undefined;
}

const MULTI_STEP_LABEL = 'Multi-step action';

export function MultiStepIndicator({
	className,
}: MultiStepIndicatorProps): ReactElement {
	const indicatorClass = ['action-card__multi-step', className]
		.filter(Boolean)
		.join(' ');
	return (
		<span
			className={indicatorClass}
			role="img"
			aria-label={MULTI_STEP_LABEL}
			title={MULTI_STEP_LABEL}
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
	);
}

export default function StepBadge({
	stepLabel,
	variant,
}: StepBadgeProps): ReactElement | null {
	if (variant !== 'back') {
		return null;
	}
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
