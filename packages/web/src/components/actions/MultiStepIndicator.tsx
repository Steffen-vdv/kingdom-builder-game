import type { ReactElement } from 'react';

export interface MultiStepIndicatorProps {
	className?: string | undefined;
	label?: string | undefined;
}

export default function MultiStepIndicator({
	className,
	label = 'Multi-step',
}: MultiStepIndicatorProps): ReactElement {
	const combinedClassName = ['action-card__multi-step', className]
		.filter(Boolean)
		.join(' ');
	return (
		<span
			className={combinedClassName}
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
			<span className="action-card__multi-step-label">{label}</span>
		</span>
	);
}
