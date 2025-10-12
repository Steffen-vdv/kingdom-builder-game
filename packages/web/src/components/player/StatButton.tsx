import React from 'react';
import type { TranslationAssets } from '../../translation/context';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { getForecastDisplay } from '../../utils/forecast';
import { formatStatValue } from '../../utils/stats';

export interface StatButtonProps {
	statKey: string;
	value: number;
	forecastDelta?: number;
	label: string;
	icon?: string;
	onShow: (statKey: string) => void;
	onHide: () => void;
	assets: TranslationAssets;
}

const formatStatDelta = (
	statKey: string,
	delta: number,
	assets: TranslationAssets,
) => {
	const formatted = formatStatValue(statKey, Math.abs(delta), assets);
	return `${delta > 0 ? '+' : '-'}${formatted}`;
};

const STAT_FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const STAT_FORECAST_BADGE_THEME_CLASS = 'bg-slate-800/70 dark:bg-slate-100/10';

const StatButtonComponent: React.FC<StatButtonProps> = ({
	statKey,
	value,
	forecastDelta,
	label,
	icon,
	onShow,
	onHide,
	assets,
}) => {
	const changes = useValueChangeIndicators(value);
	const formattedValue = formatStatValue(statKey, value, assets);
	const forecastDisplay = getForecastDisplay(forecastDelta, (delta) =>
		formatStatDelta(statKey, delta, assets),
	);
	const ariaLabel = forecastDisplay
		? `${label}: ${formattedValue} ${forecastDisplay.label}`
		: `${label}: ${formattedValue}`;
	const handleShow = React.useCallback(() => {
		onShow(statKey);
	}, [onShow, statKey]);

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
			{icon && <span aria-hidden="true">{icon}</span>}
			{formattedValue}
			{forecastDisplay && (
				<span
					className={[
						STAT_FORECAST_BADGE_CLASS,
						STAT_FORECAST_BADGE_THEME_CLASS,
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
					{formatStatDelta(statKey, change.delta, assets)}
				</span>
			))}
		</button>
	);
};

const StatButton = React.memo(StatButtonComponent);

export default StatButton;
