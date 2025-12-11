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
 * and 3 tiers centered on the current tier (1 below, current, 1 above).
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

	// Find current tier index and get visible tiers
	// (1 below, current, 1 above). If no active tier found, default to last.
	const foundIndex = sortedTiers.findIndex((t) => t.active);
	const activeIndex = foundIndex >= 0 ? foundIndex : sortedTiers.length - 1;

	// 3 tiers for the thermometer bar visualization
	const visibleTiersBar = getVisibleTiers(sortedTiers, activeIndex, 3);
	// 5 tiers for the effect rows below
	const visibleTiersRows = getVisibleTiers(sortedTiers, activeIndex, 5);

	// Find bounds for the scale FROM BAR VISIBLE TIERS ONLY
	const minTier = visibleTiersBar[0];
	const maxTier = visibleTiersBar[visibleTiersBar.length - 1];
	if (!minTier || !maxTier) {
		return null;
	}

	// Calculate range: lower bound of lowest tier to upper bound of highest tier
	// For unbounded lower: use rangeMax of that tier
	// For unbounded upper: use rangeMin of that tier
	const rawMinBound = minTier.rangeMin;
	const minBound =
		rawMinBound === undefined || rawMinBound === Number.MIN_SAFE_INTEGER
			? (minTier.rangeMax ?? 0)
			: rawMinBound;
	const rawMaxBound = maxTier.rangeMax;
	const maxBound = rawMaxBound ?? maxTier.rangeMin ?? 0;

	// Generate integer values for the range
	const integerValues: number[] = [];
	for (let i = minBound; i <= maxBound; i++) {
		integerValues.push(i);
	}

	// Convert value to percentage (0% = minBound, 100% = maxBound)
	const range = maxBound - minBound;
	const valueToPercent = (value: number) => {
		if (range === 0) {
			return 50;
		}
		return ((value - minBound) / range) * 100;
	};

	// Format label with + prefix for positive values
	const formatLabel = (value: number) =>
		value >= 0 ? `+${value}` : `${value}`;

	// Find tier boundaries (where one tier ends and next begins)
	// Boundary goes BETWEEN the two adjacent integers
	const boundaries: Array<{ percent: number }> = [];
	for (let i = 1; i < visibleTiersBar.length; i++) {
		const tier = visibleTiersBar[i];
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
		// Position boundary between (thresholdValue - 1) and thresholdValue
		// That's at thresholdValue - 0.5
		const boundaryPosition = thresholdValue - 0.5;
		const percent = valueToPercent(boundaryPosition);
		if (percent > 0 && percent < 100) {
			boundaries.push({ percent });
		}
	}

	// Calculate emoji positions (centered in each tier's range within the bar)
	const emojiPositions = visibleTiersBar.map((tier) => {
		const min = tier.rangeMin;
		const max = tier.rangeMax;

		// Clamp to visible range for positioning
		const effectiveMin =
			min === undefined || min === Number.MIN_SAFE_INTEGER
				? minBound
				: Math.max(min, minBound);
		const effectiveMax = max === undefined ? maxBound : Math.min(max, maxBound);

		// Center of tier's range
		const center = (effectiveMin + effectiveMax) / 2;
		return {
			tier,
			percent: Math.max(0, Math.min(100, valueToPercent(center))),
		};
	});

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
			<div className="flex flex-col px-2">
				{/* Integer labels row */}
				<div className="relative h-4 mb-1">
					{integerValues.map((value) => {
						const percent = valueToPercent(value);
						const isCurrent = value === currentValue;
						return (
							<span
								key={value}
								className={`absolute -translate-x-1/2 tabular-nums ${
									isCurrent
										? 'text-white font-bold text-[11px]'
										: 'text-white/40 text-[9px]'
								}`}
								style={{
									left: `${percent}%`,
									textShadow: isCurrent
										? '0 0 8px rgba(255,255,255,0.6)'
										: 'none',
								}}
							>
								{formatLabel(value)}
							</span>
						);
					})}
				</div>

				{/* Gradient bar with boundaries and current marker */}
				<div
					className="relative h-2 rounded-full"
					style={{
						background: `linear-gradient(to right,
							#f59e0b 0%,
							#22c55e 50%,
							#10b981 100%)`,
					}}
				>
					{/* Tier boundary markers */}
					{boundaries.map((b, i) => (
						<div
							key={`boundary-${i}`}
							className="absolute -top-0.5 w-0.5 h-3 rounded-sm"
							style={{
								left: `${b.percent}%`,
								transform: 'translateX(-50%)',
								background: 'rgba(255,255,255,0.5)',
								boxShadow: '0 0 4px rgba(255,255,255,0.3)',
							}}
						/>
					))}

					{/* Current value marker */}
					<div
						className="absolute -top-1 w-1 h-4 rounded-sm bg-white"
						style={{
							left: `${valueToPercent(currentValue)}%`,
							transform: 'translateX(-50%)',
							boxShadow:
								'0 0 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5)',
						}}
					/>
				</div>

				{/* Emoji row centered in tier zones */}
				<div className="relative h-6 mt-1.5">
					{emojiPositions.map(({ tier, percent }) => (
						<span
							key={tier.name}
							className={`absolute -translate-x-1/2 ${
								tier.active ? 'text-xl opacity-100' : 'text-base opacity-50'
							}`}
							style={{
								left: `${percent}%`,
								filter: tier.active
									? 'drop-shadow(0 0 4px rgba(255,255,255,0.5))'
									: 'none',
							}}
							title={tier.name}
						>
							{tier.icon}
						</span>
					))}
				</div>
			</div>

			{/* 5 Tier effect rows: 2 below, current, 2 above */}
			<div className="mt-3 flex flex-col gap-1.5 text-[11px]">
				{visibleTiersRows.map((tier) => (
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
