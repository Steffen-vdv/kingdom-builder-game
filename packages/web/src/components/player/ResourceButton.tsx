import React from 'react';
import { RESOURCES } from '@kingdom-builder/contents';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { getForecastDisplay } from '../../utils/forecast';

export interface ResourceButtonProps {
	resourceKey: keyof typeof RESOURCES;
	value: number;
	forecastDelta?: number;
	onShow: () => void;
	onHide: () => void;
}

const formatDelta = (delta: number) => {
	const absolute = Math.abs(delta);
	const formatted = Number.isInteger(absolute)
		? absolute.toString()
		: absolute.toLocaleString(undefined, {
				maximumFractionDigits: 2,
				minimumFractionDigits: 0,
			});
	return `${delta > 0 ? '+' : '-'}${formatted}`;
};

const RESOURCE_FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const RESOURCE_FORECAST_BADGE_THEME_CLASS =
	'bg-slate-800/70 dark:bg-slate-100/10';

const ResourceButton: React.FC<ResourceButtonProps> = ({
	resourceKey,
	value,
	forecastDelta,
	onShow,
	onHide,
}) => {
	const info = RESOURCES[resourceKey];
	const changes = useValueChangeIndicators(value);
	const forecastDisplay = getForecastDisplay(forecastDelta, (delta) =>
		formatDelta(delta),
	);
	const ariaLabel = forecastDisplay
		? `${info.label}: ${value} ${forecastDisplay.label}`
		: `${info.label}: ${value}`;

	return (
		<button
			type="button"
			className="bar-item hoverable cursor-help relative overflow-visible"
			onMouseEnter={onShow}
			onMouseLeave={onHide}
			onFocus={onShow}
			onBlur={onHide}
			onClick={onShow}
			aria-label={ariaLabel}
		>
			{info.icon}
			{value}
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
					{formatDelta(change.delta)}
				</span>
			))}
		</button>
	);
};

export default ResourceButton;
