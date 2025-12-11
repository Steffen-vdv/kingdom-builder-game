import React from 'react';
import type { TierSummary } from './buildTierEntries';

interface TierThermometerProps {
	/** The current value of the tiered resource */
	currentValue: number;
	/** Tier summaries in display order (highest tier first) */
	tiers: TierSummary[];
	/** Icon for the resource */
	resourceIcon?: string;
}

/**
 * A vertical thermometer showing tier thresholds and current value.
 *
 * The thermometer shows:
 * - Boundaries between tiers as horizontal lines with threshold values
 * - The current value as a green marker line
 * - Tier icons on the side indicating which tier each section belongs to
 */
const TierThermometer: React.FC<TierThermometerProps> = ({
	currentValue,
	tiers,
	resourceIcon,
}) => {
	const minTier = tiers[tiers.length - 1];
	const maxTier = tiers[0];
	if (!minTier || !maxTier) {
		return null;
	}

	// Calculate the range to display
	// Use actual tier boundaries, with some padding for visual clarity
	// Get boundary values
	const displayMin = minTier.rangeMin ?? -15;
	const displayMax = maxTier.rangeMax ?? maxTier.rangeMin ?? 15;

	// Add padding for unbounded tiers
	const paddedMin =
		minTier.rangeMin === Number.MIN_SAFE_INTEGER
			? Math.min(currentValue - 2, displayMin)
			: displayMin - 1;
	const paddedMax =
		maxTier.rangeMax === undefined
			? Math.max(currentValue + 2, (maxTier.rangeMin ?? 0) + 5)
			: displayMax + 1;

	const range = paddedMax - paddedMin;

	// Calculate position percentage (0% = bottom, 100% = top)
	const valueToPercent = (value: number) => {
		if (range === 0) {
			return 50;
		}
		return ((value - paddedMin) / range) * 100;
	};

	// Clamp the current value position to stay within visible bounds
	const currentPercent = Math.max(
		5,
		Math.min(95, valueToPercent(currentValue)),
	);

	// Collect threshold lines between tiers
	const thresholds: Array<{
		value: number;
		percent: number;
		labelAbove: string;
		labelBelow: string;
	}> = [];

	for (let i = 0; i < tiers.length - 1; i++) {
		const upperTier = tiers[i];
		const lowerTier = tiers[i + 1];
		if (!upperTier || !lowerTier) {
			continue;
		}

		// The threshold is the boundary between tiers
		// Upper tier's min is the threshold value
		const thresholdValue = upperTier.rangeMin;
		if (
			thresholdValue === undefined ||
			thresholdValue === Number.MIN_SAFE_INTEGER
		) {
			continue;
		}

		const percent = valueToPercent(thresholdValue);
		if (percent < 0 || percent > 100) {
			continue;
		}

		thresholds.push({
			value: thresholdValue,
			percent,
			labelAbove: upperTier.icon,
			labelBelow: lowerTier.icon,
		});
	}

	return (
		<div className="tier-thermometer flex items-center gap-2 py-2">
			{/* Thermometer bar */}
			<div className="relative h-24 w-4 rounded-full bg-neutral-200 dark:bg-neutral-700">
				{/* Tier sections as colored backgrounds */}
				{tiers.map((tier, index) => {
					const nextTier = tiers[index + 1];
					const topValue = tier.rangeMax ?? paddedMax;
					const bottomValue = nextTier?.rangeMin ?? tier.rangeMin ?? paddedMin;

					const topPercent = Math.min(
						100,
						Math.max(0, valueToPercent(topValue)),
					);
					const bottomPercent = Math.min(
						100,
						Math.max(0, valueToPercent(bottomValue)),
					);
					const height = topPercent - bottomPercent;

					if (height <= 0) {
						return null;
					}

					return (
						<div
							key={tier.name}
							className={`absolute left-0 w-full rounded-full transition-colors ${
								tier.active
									? 'bg-emerald-400/40 dark:bg-emerald-500/40'
									: 'bg-neutral-300/30 dark:bg-neutral-600/30'
							}`}
							style={{
								bottom: `${bottomPercent}%`,
								height: `${height}%`,
							}}
						/>
					);
				})}

				{/* Threshold lines */}
				{thresholds.map((threshold) => (
					<div
						key={`threshold-${threshold.value}`}
						className="absolute left-0 w-full border-t border-neutral-400 dark:border-neutral-500"
						style={{ bottom: `${threshold.percent}%` }}
					/>
				))}

				{/* Current value marker */}
				<div
					className="absolute -left-1 -right-1 h-0.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"
					style={{ bottom: `${currentPercent}%` }}
				>
					{/* Arrow indicator */}
					<div className="absolute -right-2 top-1/2 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-emerald-500" />
				</div>
			</div>

			{/* Labels column */}
			<div className="relative h-24 flex flex-col justify-between text-xs">
				{/* Threshold labels */}
				{thresholds.map((threshold) => (
					<div
						key={`label-${threshold.value}`}
						className="absolute left-0 flex items-center gap-1 -translate-y-1/2"
						style={{ bottom: `${threshold.percent}%` }}
					>
						<span className="text-neutral-600 dark:text-neutral-400 tabular-nums">
							{threshold.value >= 0 ? `+${threshold.value}` : threshold.value}
						</span>
						<span className="text-neutral-500">
							{threshold.labelAbove}/{threshold.labelBelow}
						</span>
					</div>
				))}

				{/* Current value label (only if not near a threshold) */}
				<div
					className="absolute left-0 flex items-center gap-1 -translate-y-1/2 font-medium text-emerald-600 dark:text-emerald-400"
					style={{ bottom: `${currentPercent}%` }}
				>
					<span className="tabular-nums">
						{resourceIcon}{' '}
						{currentValue >= 0 ? `+${currentValue}` : currentValue}
					</span>
				</div>
			</div>

			{/* Tier icons column */}
			<div className="relative h-24 flex flex-col justify-between">
				{tiers.map((tier, index) => {
					const nextTier = tiers[index + 1];
					const topValue = tier.rangeMax ?? paddedMax;
					const bottomValue = nextTier?.rangeMin ?? tier.rangeMin ?? paddedMin;
					const midpoint = (topValue + bottomValue) / 2;
					const percent = valueToPercent(midpoint);

					return (
						<div
							key={`icon-${tier.name}`}
							className={`absolute -translate-y-1/2 text-base ${
								tier.active ? 'opacity-100' : 'opacity-50'
							}`}
							style={{ bottom: `${percent}%` }}
							title={tier.name}
						>
							{tier.icon}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default TierThermometer;
