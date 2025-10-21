import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { HistoryState } from './appHistory';

type GameplayHistoryKey = 'isAutoAcknowledgeEnabled' | 'isAutoPassEnabled';

interface PreferenceSetters {
	setIsAutoAcknowledgeEnabled: Dispatch<SetStateAction<boolean>>;
	setIsAutoPassEnabled: Dispatch<SetStateAction<boolean>>;
}

type BuildHistoryState = (overrides?: Partial<HistoryState>) => HistoryState;
type ReplaceHistoryState = (nextState: HistoryState) => void;

export function useGameplayPreferenceToggles(
	buildHistoryState: BuildHistoryState,
	replaceHistoryState: ReplaceHistoryState,
	{ setIsAutoAcknowledgeEnabled, setIsAutoPassEnabled }: PreferenceSetters,
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

	const toggleAutoAcknowledge = useMemo(
		() =>
			createPreferenceToggle(
				setIsAutoAcknowledgeEnabled,
				'isAutoAcknowledgeEnabled',
			),
		[createPreferenceToggle, setIsAutoAcknowledgeEnabled],
	);

	const toggleAutoPass = useMemo(
		() => createPreferenceToggle(setIsAutoPassEnabled, 'isAutoPassEnabled'),
		[createPreferenceToggle, setIsAutoPassEnabled],
	);

	return { toggleAutoAcknowledge, toggleAutoPass } as const;
}
