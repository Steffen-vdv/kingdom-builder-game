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
 * A horizontal thermometer showing tier thresholds, current value,
 * and 5 tiers centered on the current tier (2 below, current, 2 above).
 */
const TierThermometer: React.FC<TierThermometerProps> = ({
	currentValue,
	tiers,
}) => {
	if (tiers.length === 0) {
		return null;
	}

	// Tiers come in highest-first order, reverse for display (lowest on left)
	const sortedTiers = [...tiers].reverse();

	// Find bounds for the scale
	const minTier = sortedTiers[0];
	const maxTier = sortedTiers[sortedTiers.length - 1];
	if (!minTier || !maxTier) {
		return null;
	}

	// Calculate display range from tier data
	// For unbounded lower (MIN_SAFE_INTEGER), use rangeMax of lowest tier
	// For unbounded upper (undefined rangeMax), use rangeMin of highest tier
	const rawMinBound = minTier.rangeMin;
	const minBound =
		rawMinBound === undefined || rawMinBound === Number.MIN_SAFE_INTEGER
			? (minTier.rangeMax ?? 0)
			: rawMinBound;
	const rawMaxBound = maxTier.rangeMax;
	const maxBound = rawMaxBound ?? maxTier.rangeMin ?? 0;
	const paddedMin = Math.min(minBound - 1, currentValue - 1);
	const paddedMax = Math.max(maxBound + 1, currentValue + 1);
	const range = paddedMax - paddedMin;

	// Convert value to percentage (0% = left, 100% = right)
	const valueToPercent = (value: number) => {
		if (range === 0) {
			return 50;
		}
		return ((value - paddedMin) / range) * 100;
	};

	// Clamp marker position
	const markerPercent = Math.max(3, Math.min(97, valueToPercent(currentValue)));

	// Collect threshold values (boundaries between tiers)
	const thresholds: Array<{ value: number; percent: number }> = [];
	for (let i = 1; i < sortedTiers.length; i++) {
		const tier = sortedTiers[i];
		if (!tier) {
			continue;
		}
		const thresholdValue = tier.rangeMin;
		if (
			thresholdValue === undefined ||
			thresholdValue === Number.MIN_SAFE_INTEGER
		) {
			continue;
		}
		const percent = valueToPercent(thresholdValue);
		if (percent > 0 && percent < 100) {
			thresholds.push({ value: thresholdValue, percent });
		}
	}

	// Find current tier index and get 5 tiers centered on current
	// (2 below, current, 2 above). If no active tier found, default to last.
	const foundIndex = sortedTiers.findIndex((t) => t.active);
	const activeIndex = foundIndex >= 0 ? foundIndex : sortedTiers.length - 1;
	const visibleTiers = getVisibleTiers(sortedTiers, activeIndex, 5);

	// Format threshold label
	const formatThreshold = (value: number) =>
		value >= 0 ? `+${value}` : `${value}`;

	// Get effect items from tier entry as array
	const getEffectItems = (tier: TierSummary | undefined): string[] => {
		if (!tier) {
			return [];
		}
		const items = tier.entry.items;
		if (items.length === 0) {
			return ['No effect'];
		}
		return items.map((item): string =>
			typeof item === 'string' ? item : item.title,
		);
	};

	return (
		<div className="tier-thermometer">
			{/* Thermometer bar section */}
			<div className="flex flex-col gap-1.5">
				{/* Threshold labels above */}
				<div className="relative h-3 text-[10px] text-neutral-500">
					{thresholds.map((t) => (
						<span
							key={t.value}
							className="absolute -translate-x-1/2 tabular-nums"
							style={{ left: `${t.percent}%` }}
						>
							{formatThreshold(t.value)}
						</span>
					))}
				</div>

				{/* Gradient track with ticks and marker */}
				<div
					className="relative h-3 rounded-full"
					style={{
						background: `linear-gradient(to right,
							#dc2626 0%,
							#f97316 25%,
							#eab308 50%,
							#84cc16 75%,
							#22c55e 100%)`,
					}}
				>
					{/* Threshold tick marks */}
					{thresholds.map((t) => (
						<div
							key={`tick-${t.value}`}
							className="absolute top-0 bottom-0 w-0.5 bg-black/30"
							style={{ left: `${t.percent}%` }}
						/>
					))}

					{/* Current value marker */}
					<div
						className="absolute -top-1 -bottom-1 w-1.5 rounded-sm bg-white"
						style={{
							left: `${markerPercent}%`,
							transform: 'translateX(-50%)',
							boxShadow: '0 0 6px rgba(255, 255, 255, 0.9)',
						}}
					/>
				</div>

				{/* Tier icons below */}
				<div className="relative h-5 text-sm">
					{sortedTiers.map((tier, index) => {
						const nextT = sortedTiers[index + 1];
						const left = tier.rangeMin ?? paddedMin;
						const right = nextT?.rangeMin ?? paddedMax;
						const midpoint = (left + right) / 2;
						const percent = valueToPercent(midpoint);

						return (
							<span
								key={tier.name}
								className={`absolute -translate-x-1/2 transition-all ${
									tier.active ? 'opacity-100 scale-110' : 'opacity-40'
								}`}
								style={{ left: `${Math.max(5, Math.min(95, percent))}%` }}
								title={tier.name}
							>
								{tier.icon}
							</span>
						);
					})}
				</div>
			</div>

			{/* 5 Tier effect rows: 2 below, current, 2 above */}
			<div className="mt-3 flex flex-col gap-1.5 text-[11px]">
				{visibleTiers.map((tier) => (
					<TierEffectRow
						key={tier.name}
						tier={tier}
						rangeLabel={tier.rangeLabel}
						effects={getEffectItems(tier)}
						variant={tier.active ? 'current' : 'adjacent'}
					/>
				))}
			</div>
		</div>
	);
};

/**
 * Get up to `count` tiers centered on the active tier.
 * Returns tiers in display order (lowest first).
 */
function getVisibleTiers(
	sortedTiers: TierSummary[],
	activeIndex: number,
	count: number,
): TierSummary[] {
	if (sortedTiers.length <= count) {
		return sortedTiers;
	}

	// Calculate how many tiers on each side
	const halfBelow = Math.floor((count - 1) / 2);
	const halfAbove = count - 1 - halfBelow;

	// Calculate start index, clamping to valid range
	let startIndex = activeIndex - halfBelow;
	let endIndex = activeIndex + halfAbove;

	// Adjust if we go out of bounds
	if (startIndex < 0) {
		endIndex = Math.min(sortedTiers.length - 1, endIndex - startIndex);
		startIndex = 0;
	}
	if (endIndex >= sortedTiers.length) {
		startIndex = Math.max(0, startIndex - (endIndex - sortedTiers.length + 1));
		endIndex = sortedTiers.length - 1;
	}

	return sortedTiers.slice(startIndex, endIndex + 1);
}

interface TierEffectRowProps {
	tier: TierSummary;
	rangeLabel: string;
	effects: string[];
	variant: 'current' | 'adjacent';
}

const TierEffectRow: React.FC<TierEffectRowProps> = ({
	tier,
	rangeLabel,
	effects,
	variant,
}) => {
	const isCurrent = variant === 'current';

	return (
		<div
			className={`flex items-start gap-2 rounded-md px-2 py-1 ${
				isCurrent
					? 'bg-white/10 ring-1 ring-white/10'
					: 'bg-white/[0.03] opacity-60'
			}`}
		>
			<span className="text-sm flex-shrink-0">{tier.icon}</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span
						className={`font-medium ${isCurrent ? 'text-white/90' : 'text-white/70'}`}
					>
						{tier.name}
					</span>
					<span className="text-[9px] text-white/40 tabular-nums">
						{rangeLabel}
					</span>
				</div>
				{effects.length === 1 ? (
					<div className="text-white/50 mt-0.5">{effects[0]}</div>
				) : (
					<ul className="text-white/50 mt-0.5 list-disc list-inside">
						{effects.map((effect, i) => (
							<li key={i}>{effect}</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

export default TierThermometer;
