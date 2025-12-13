import React from 'react';

interface HappinessBarProps {
	currentValue: number;
	tierName: string;
	icon: string;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
}

/**
 * Compact happiness bar spanning full width.
 * Shows gradient bar with current tier label - details in hover card.
 */
const HappinessBar: React.FC<HappinessBarProps> = ({
	currentValue,
	tierName,
	icon,
	onMouseEnter,
	onMouseLeave,
}) => {
	// Format value with + prefix for positive
	const formattedValue =
		currentValue >= 0 ? `+${currentValue}` : `${currentValue}`;

	// Map value to percentage (assuming -4 to +4 visible range, clamped)
	const minBound = -4;
	const maxBound = 4;
	const clampedValue = Math.max(minBound, Math.min(maxBound, currentValue));
	const percent = ((clampedValue - minBound) / (maxBound - minBound)) * 100;

	return (
		<div
			className="resource-bar"
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			onFocus={onMouseEnter}
			onBlur={onMouseLeave}
			role="button"
			tabIndex={0}
		>
			<span className="text-sm flex-shrink-0 w-5 text-center">{icon}</span>
			<div className="bar-track">
				{/* Gradient fill */}
				<div
					className="absolute inset-y-0 left-0 rounded-lg"
					style={{
						width: `${percent}%`,
						background: 'linear-gradient(90deg, #ef4444, #fbbf24, #22c55e)',
					}}
				/>
				{/* Label overlay */}
				<span className="bar-label">
					{tierName} {formattedValue}
				</span>
			</div>
		</div>
	);
};

export default HappinessBar;
