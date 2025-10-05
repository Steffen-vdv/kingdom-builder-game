import { useCallback, useEffect, useRef, useState } from 'react';

export interface PhaseDisplayOptions {
	manual?: boolean;
}

export function usePhaseDisplay(initialPhase: string) {
	const [displayPhase, setDisplayPhase] = useState(initialPhase);
	const [tabsEnabled, setTabsEnabled] = useState(false);
	const manualPhaseRef = useRef<string | null>(null);
	const tabsEnabledRef = useRef(tabsEnabled);

	useEffect(() => {
		tabsEnabledRef.current = tabsEnabled;
		if (!tabsEnabled) {
			manualPhaseRef.current = null;
		}
	}, [tabsEnabled]);

	const updateDisplayPhase = useCallback(
		(phase: string, options?: PhaseDisplayOptions) => {
			if (options?.manual && tabsEnabledRef.current) {
				manualPhaseRef.current = phase;
			} else if (
				tabsEnabledRef.current &&
				manualPhaseRef.current &&
				manualPhaseRef.current !== phase
			) {
				return;
			} else {
				manualPhaseRef.current = null;
			}
			setDisplayPhase(phase);
		},
		[],
	);

	const isManualPhasePinned = useCallback((phase: string) => {
		if (!tabsEnabledRef.current) {
			return false;
		}
		const manualPhase = manualPhaseRef.current;
		if (!manualPhase) {
			return false;
		}
		return manualPhase !== phase;
	}, []);

	return {
		displayPhase,
		setDisplayPhase: updateDisplayPhase,
		tabsEnabled,
		setTabsEnabled,
		isManualPhasePinned,
	};
}
