import React from 'react';
import { useValueChangeIndicators } from '../../utils/useValueChangeIndicators';
import { getForecastDisplay } from '../../utils/forecast';
import {
	formatResourceV2Delta,
	formatResourceV2Summary,
	formatResourceV2Value,
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../../translation/resourceV2';

export interface StatButtonProps {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
	onShow: () => void;
	onHide: () => void;
}

const STAT_FORECAST_BADGE_CLASS =
	'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
const STAT_FORECAST_BADGE_THEME_CLASS = 'bg-slate-800/70 dark:bg-slate-100/10';

const StatButtonComponent: React.FC<StatButtonProps> = ({
	metadata,
	snapshot,
	onShow,
	onHide,
}) => {
	const { current, forecastDelta } = snapshot;
	const changes = useValueChangeIndicators(current);
	const formattedValue = formatResourceV2Value(metadata, current);
	const resolvedForecastDelta =
		typeof forecastDelta === 'number' ? forecastDelta : undefined;
	const forecastDisplay = getForecastDisplay(resolvedForecastDelta, (delta) =>
		formatResourceV2Delta(metadata, delta),
	);
	const ariaLabel = formatResourceV2Summary(metadata, snapshot);

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
			{metadata.icon && <span aria-hidden="true">{metadata.icon}</span>}
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
					{formatResourceV2Delta(metadata, change.delta)}
				</span>
			))}
		</button>
	);
};

const StatButton = React.memo(StatButtonComponent);

export default StatButton;
