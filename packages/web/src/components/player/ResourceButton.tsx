import React from 'react';
import type {
	ResourceV2MetadataSnapshot,
	ResourceV2ValueSnapshot,
} from '../../translation';
import { getForecastDisplay } from '../../utils/forecast';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';

export interface ResourceButtonProps {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
	onShow: (resourceId: string) => void;
	onHide: () => void;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

type SessionMetadataFormat = ResourceV2MetadataSnapshot['format'];

type FormatDescriptor =
	| NonNullable<SessionMetadataFormat>
	| { prefix?: string | null; percent?: boolean | null }
	| undefined;

function readFormat(metadata: ResourceV2MetadataSnapshot): FormatDescriptor {
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
	metadata: ResourceV2MetadataSnapshot,
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
	metadata: ResourceV2MetadataSnapshot,
): string {
	const magnitude = formatResourceMagnitude(Math.abs(value), metadata);
	const sign = value >= 0 ? '+' : '-';
	return `${sign}${magnitude}`;
}

const FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const FORECAST_BADGE_THEME_CLASS = 'bg-slate-800/70 dark:bg-slate-100/10';

const ResourceButtonComponent: React.FC<ResourceButtonProps> = ({
	metadata,
	snapshot,
	onShow,
	onHide,
}) => {
	const changes = useValueChangeIndicators(snapshot.current);
	const normalizedForecastDelta =
		snapshot.forecastDelta === null ? undefined : snapshot.forecastDelta;
	const forecastDisplay = getForecastDisplay(normalizedForecastDelta, (delta) =>
		formatSignedResourceMagnitude(delta, metadata),
	);
	const iconLabel = metadata.icon ?? '❔';
	const formattedValue = formatResourceMagnitude(snapshot.current, metadata);
	const ariaLabel = forecastDisplay
		? `${metadata.label}: ${formattedValue} ${forecastDisplay.label}`
		: `${metadata.label}: ${formattedValue}`;
	const handleShow = React.useCallback(() => {
		onShow(snapshot.id);
	}, [onShow, snapshot.id]);

	return (
		<button
			type="button"
			className="bar-item hoverable cursor-help relative overflow-visible"
			onMouseEnter={handleShow}
			onMouseLeave={onHide}
			onFocus={handleShow}
			onBlur={onHide}
			onClick={handleShow}
			aria-label={ariaLabel}
		>
			<span aria-hidden="true">{iconLabel}</span>
			{formattedValue}
			{forecastDisplay && (
				<span
					className={[
						FORECAST_BADGE_CLASS,
						FORECAST_BADGE_THEME_CLASS,
						forecastDisplay.toneClass,
					].join(' ')}
				>
					{forecastDisplay.label}
				</span>
			)}
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
