import React from 'react';
import type {
	ResourceMetadataSnapshot,
	ResourceValueSnapshot,
} from '../../translation';
import { getForecastDisplay } from '../../utils/forecast';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';

export type ColorVariant = 'default' | 'army' | 'fort';

export interface ResourceButtonProps {
	metadata: ResourceMetadataSnapshot;
	snapshot: ResourceValueSnapshot;
	onShow: (resourceId: string) => void;
	onHide: () => void;
	/** When true, renders with smaller text and reduced padding */
	compact?: boolean;
	/** Color variant for combat stats (army=red tint, fort=blue tint) */
	colorVariant?: ColorVariant;
	/** Optional suffix label (e.g., "HP") shown instead of forecast */
	suffixLabel?: string;
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

const COLOR_VARIANT_CLASSES: Record<ColorVariant, string> = {
	default: '',
	army: 'stat-chip--army',
	fort: 'stat-chip--fort',
};

const ResourceButtonComponent: React.FC<ResourceButtonProps> = ({
	metadata,
	snapshot,
	onShow,
	onHide,
	compact = false,
	colorVariant = 'default',
	suffixLabel,
}) => {
	const changes = useValueChangeIndicators(snapshot.current);
	const normalizedForecastDelta =
		snapshot.forecastDelta === null ? undefined : snapshot.forecastDelta;
	const forecastDisplay = getForecastDisplay(normalizedForecastDelta, (delta) =>
		formatSignedResourceMagnitude(delta, metadata),
	);
	const iconLabel = metadata.icon ?? '⚠️';
	const formattedValue = formatResourceMagnitude(snapshot.current, metadata);
	const ariaLabel = forecastDisplay
		? `${metadata.label}: ${formattedValue} ${forecastDisplay.label}`
		: `${metadata.label}: ${formattedValue}`;
	const handleShow = React.useCallback(() => {
		onShow(snapshot.id);
	}, [onShow, snapshot.id]);

	// For compact mode (mini-chip), render inline icon + value + forecast
	if (compact) {
		return (
			<button
				type="button"
				className="mini-chip cursor-help relative overflow-visible"
				onMouseEnter={handleShow}
				onMouseLeave={onHide}
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

	// Build stat-chip class with optional color variant
	const variantClass = COLOR_VARIANT_CLASSES[colorVariant];
	const chipClass = [
		'stat-chip cursor-help relative overflow-visible',
		variantClass,
	]
		.filter(Boolean)
		.join(' ');

	// Primary stat-chip: icon+value left, forecast/suffix right
	return (
		<button
			type="button"
			className={chipClass}
			onMouseEnter={handleShow}
			onMouseLeave={onHide}
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
