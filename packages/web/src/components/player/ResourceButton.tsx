import React from 'react';
import type {
	ResourceMetadataSnapshot,
	ResourceValueSnapshot,
} from '../../translation';
import { getForecastDisplay } from '../../utils/forecast';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';

export interface ResourceButtonProps {
	metadata: ResourceMetadataSnapshot;
	snapshot: ResourceValueSnapshot;
	onShow: (resourceId: string) => void;
	onHide: () => void;
	/** When true, renders with smaller text and reduced padding */
	compact?: boolean;
	/**
	 * Display hint color (CSS color value) for background tint.
	 * Applied with reduced opacity for visual differentiation.
	 */
	displayHint?: string | null;
	/** Optional suffix label (e.g., "HP") shown instead of forecast */
	suffixLabel?: string;
	/**
	 * Numeric upper bound for the resource (e.g., Castle HP max 10).
	 * When provided, displays value as "current/max" format.
	 */
	numericUpperBound?: number | null;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

type SessionMetadataFormat = ResourceMetadataSnapshot['format'];

type FormatDescriptor =
	| NonNullable<SessionMetadataFormat>
	| { prefix?: string | null; percent?: boolean | null }
	| undefined;

function readFormat(metadata: ResourceMetadataSnapshot): FormatDescriptor {
	if (typeof metadata.format === 'object' && metadata.format !== null) {
		return metadata.format;
	}
	if (metadata.displayAsPercent) {
		return { percent: true };
	}
	return metadata.format;
}

function formatNumber(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return NUMBER_FORMATTER.format(value);
}

function shouldDisplayPercent(descriptor: FormatDescriptor): boolean {
	if (!descriptor) {
		return false;
	}
	if (typeof descriptor === 'string') {
		return descriptor.trim().length > 0 && descriptor.includes('%');
	}
	return descriptor.percent === true;
}

function resolvePrefix(descriptor: FormatDescriptor): string | undefined {
	if (!descriptor) {
		return undefined;
	}
	if (typeof descriptor === 'string') {
		const trimmed = descriptor.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	if (typeof descriptor.prefix === 'string') {
		const trimmed = descriptor.prefix.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	}
	return undefined;
}

export function formatResourceMagnitude(
	value: number,
	metadata: ResourceMetadataSnapshot,
): string {
	const descriptor = readFormat(metadata);
	const prefix = resolvePrefix(descriptor);
	const formatted = shouldDisplayPercent(descriptor)
		? `${formatNumber(value * 100)}%`
		: formatNumber(value);
	return prefix ? `${prefix}${formatted}` : formatted;
}

export function formatSignedResourceMagnitude(
	value: number,
	metadata: ResourceMetadataSnapshot,
): string {
	const magnitude = formatResourceMagnitude(Math.abs(value), metadata);
	const sign = value >= 0 ? '+' : '-';
	return `${sign}${magnitude}`;
}

/**
 * Converts a CSS color to rgba format with specified opacity.
 * Supports hex (#rgb, #rrggbb), rgb(), and named colors via canvas.
 */
function colorToRgba(color: string, opacity: number): string {
	// Handle hex colors directly for performance
	if (color.startsWith('#')) {
		const hex = color.slice(1);
		let red: number, green: number, blue: number;
		if (hex.length === 3) {
			red = parseInt(hex.charAt(0) + hex.charAt(0), 16);
			green = parseInt(hex.charAt(1) + hex.charAt(1), 16);
			blue = parseInt(hex.charAt(2) + hex.charAt(2), 16);
		} else {
			red = parseInt(hex.slice(0, 2), 16);
			green = parseInt(hex.slice(2, 4), 16);
			blue = parseInt(hex.slice(4, 6), 16);
		}
		return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
	}
	// For other formats, return color-mix (modern browsers)
	return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

const ResourceButtonComponent: React.FC<ResourceButtonProps> = ({
	metadata,
	snapshot,
	onShow,
	onHide,
	compact = false,
	displayHint,
	suffixLabel,
	numericUpperBound,
}) => {
	const [isHovered, setIsHovered] = React.useState(false);
	const changes = useValueChangeIndicators(snapshot.current);
	const normalizedForecastDelta =
		snapshot.forecastDelta === null ? undefined : snapshot.forecastDelta;
	const forecastDisplay = getForecastDisplay(normalizedForecastDelta, (delta) =>
		formatSignedResourceMagnitude(delta, metadata),
	);
	const iconLabel = metadata.icon ?? '⚠️';
	const currentFormatted = formatResourceMagnitude(snapshot.current, metadata);
	// Format as "current/max" when numeric upper bound is provided
	const formattedValue =
		numericUpperBound != null
			? `${currentFormatted}/${formatNumber(numericUpperBound)}`
			: currentFormatted;
	const ariaLabel = forecastDisplay
		? `${metadata.label}: ${formattedValue} ${forecastDisplay.label}`
		: `${metadata.label}: ${formattedValue}`;
	const handleShow = React.useCallback(() => {
		onShow(snapshot.id);
	}, [onShow, snapshot.id]);

	// Event handlers that track hover state
	const handleMouseEnter = React.useCallback(() => {
		setIsHovered(true);
		onShow(snapshot.id);
	}, [onShow, snapshot.id]);

	const handleMouseLeave = React.useCallback(() => {
		setIsHovered(false);
		onHide();
	}, [onHide]);

	// Build inline style for displayHint background (10% normal, 15% hover)
	const hintStyle: React.CSSProperties | undefined = displayHint
		? { background: colorToRgba(displayHint, isHovered ? 0.15 : 0.1) }
		: undefined;

	// For compact mode (mini-chip), render inline icon + value + forecast
	if (compact) {
		return (
			<button
				type="button"
				className="mini-chip cursor-help relative overflow-visible"
				style={hintStyle}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onFocus={handleShow}
				onBlur={onHide}
				onClick={handleShow}
				aria-label={ariaLabel}
			>
				<span aria-hidden="true">{iconLabel}</span>
				<strong>{formattedValue}</strong>
				{forecastDisplay && (
					<span className={`text-[9px] ${forecastDisplay.toneClass}`}>
						{forecastDisplay.label}
					</span>
				)}
			</button>
		);
	}

	// Primary stat-chip: icon+value left, forecast/suffix right
	return (
		<button
			type="button"
			className="stat-chip cursor-help relative overflow-visible"
			style={hintStyle}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onFocus={handleShow}
			onBlur={onHide}
			onClick={handleShow}
			aria-label={ariaLabel}
		>
			<span className="flex items-center gap-1.5">
				<span className="stat-chip__icon" aria-hidden="true">
					{iconLabel}
				</span>
				<span className="stat-chip__value">{formattedValue}</span>
			</span>
			{suffixLabel ? (
				<span className="text-[10px] text-slate-500">{suffixLabel}</span>
			) : forecastDisplay ? (
				<span
					className={`text-[11px] font-semibold ${forecastDisplay.toneClass}`}
				>
					{forecastDisplay.label}
				</span>
			) : null}
			{changes.map((change) => (
				<span
					key={change.id}
					className={`value-change-indicator ${
						change.direction === 'gain'
							? 'value-change-indicator--gain text-emerald-300'
							: 'value-change-indicator--loss text-rose-300'
					}`}
					aria-hidden="true"
				>
					{formatSignedResourceMagnitude(change.delta, metadata)}
				</span>
			))}
		</button>
	);
};

const ResourceButton = React.memo(ResourceButtonComponent);

export default ResourceButton;
