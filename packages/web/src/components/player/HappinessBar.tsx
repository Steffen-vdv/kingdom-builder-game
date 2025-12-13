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

	// Map value to percentage (full -10 to +10 range)
	const minBound = -10;
	const maxBound = 10;
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
			<span className="text-[20px] flex-shrink-0 w-6 text-center">{icon}</span>
			<div className="bar-track">
				{/* Fixed full-width gradient background */}
				<div
					className="absolute inset-0 rounded-lg"
					style={{
						background: 'linear-gradient(90deg, #ef4444, #fbbf24, #22c55e)',
					}}
				/>
				{/* Mask overlay that hides the unfilled portion */}
				<div
					className="absolute inset-y-0 right-0 rounded-r-lg bg-slate-800/90"
					style={{
						width: `${100 - percent}%`,
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
