export interface ForecastDisplay {
	label: string;
	toneClass: string;
}

export const getForecastDisplay = (
	delta: number | undefined,
	formatDelta: (value: number) => string,
): ForecastDisplay | undefined => {
	if (typeof delta !== 'number' || delta === 0) {
		return undefined;
	}
	return {
		label: `(${formatDelta(delta)})`,
		toneClass: delta > 0 ? 'text-emerald-300' : 'text-rose-300',
	};
};
