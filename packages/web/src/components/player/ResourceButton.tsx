import React from 'react';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { getForecastDisplay } from '../../utils/forecast';

export interface ResourceButtonProps {
	resourceId: string;
	label: string;
	icon?: string;
	value: number;
	forecastDelta?: number;
	onShow: (resourceId: string) => void;
	onHide: () => void;
	formatValue?: (value: number) => string;
	formatDelta?: (delta: number) => string;
}

const formatNumericValue = (value: number): string => {
	if (!Number.isFinite(value)) {
		return '0';
	}
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	});
};

const defaultFormatValue = (value: number): string => formatNumericValue(value);

const defaultFormatDelta = (delta: number): string => {
	const absolute = formatNumericValue(Math.abs(delta));
	const prefix = delta >= 0 ? '+' : '-';
	return `${prefix}${absolute}`;
};

const RESOURCE_FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const RESOURCE_FORECAST_BADGE_THEME_CLASS =
	'bg-slate-800/70 dark:bg-slate-100/10';

const ResourceButtonComponent: React.FC<ResourceButtonProps> = ({
	resourceId,
	label,
	icon,
	value,
	forecastDelta,
	onShow,
	onHide,
	formatValue,
	formatDelta,
}) => {
	const changes = useValueChangeIndicators(value);
	const resolveValue = formatValue ?? defaultFormatValue;
	const resolveDelta = formatDelta ?? defaultFormatDelta;
	const forecastDisplay = getForecastDisplay(forecastDelta, (delta) =>
		resolveDelta(delta),
	);
	const iconLabel = icon ?? '❔';
	const resolvedLabel = label || resourceId;
	const formattedValue = resolveValue(value);
	const ariaLabel = forecastDisplay
		? `${resolvedLabel}: ${formattedValue} ${forecastDisplay.label}`
		: `${resolvedLabel}: ${formattedValue}`;
	const handleShow = React.useCallback(() => {
		onShow(resourceId);
	}, [onShow, resourceId]);

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
			{iconLabel}
			{formattedValue}
			{forecastDisplay && (
				<span
					className={[
						RESOURCE_FORECAST_BADGE_CLASS,
						RESOURCE_FORECAST_BADGE_THEME_CLASS,
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
					{resolveDelta(change.delta)}
				</span>
			))}
		</button>
	);
};

const ResourceButton = React.memo(ResourceButtonComponent);

export default ResourceButton;
