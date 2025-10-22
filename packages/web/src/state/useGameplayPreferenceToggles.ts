import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { HistoryState } from './appHistory';

type GameplayHistoryKey = 'isAutoAdvanceEnabled';

interface PreferenceSetters {
	setIsAutoAdvanceEnabled: Dispatch<SetStateAction<boolean>>;
}

type BuildHistoryState = (overrides?: Partial<HistoryState>) => HistoryState;
type ReplaceHistoryState = (nextState: HistoryState) => void;

export function useGameplayPreferenceToggles(
	buildHistoryState: BuildHistoryState,
	replaceHistoryState: ReplaceHistoryState,
	{ setIsAutoAdvanceEnabled }: PreferenceSetters,
) {
	const createPreferenceToggle = useCallback(
		(setter: Dispatch<SetStateAction<boolean>>, key: GameplayHistoryKey) => {
			return () => {
				setter((previousValue) => {
					const nextValue = !previousValue;
					replaceHistoryState(
						buildHistoryState({
							[key]: nextValue,
						}),
					);
					return nextValue;
				});
			};
		},
		[buildHistoryState, replaceHistoryState],
	);

	const toggleAutoAdvance = useMemo(
		() =>
			createPreferenceToggle(setIsAutoAdvanceEnabled, 'isAutoAdvanceEnabled'),
		[createPreferenceToggle, setIsAutoAdvanceEnabled],
	);

	return { toggleAutoAdvance } as const;
}
