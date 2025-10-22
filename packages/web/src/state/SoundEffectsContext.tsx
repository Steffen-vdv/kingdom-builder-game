import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSoundEffects } from './useSoundEffects';

interface SoundEffectsValue {
	enabled: boolean;
	playResolutionSpawn: () => void;
	playTranslationTick: () => void;
	playUiClick: () => void;
}

const DEFAULT_VALUE: SoundEffectsValue = {
	enabled: false,
	playResolutionSpawn: () => {},
	playTranslationTick: () => {},
	playUiClick: () => {},
};

const SoundEffectsContext = createContext<SoundEffectsValue>(DEFAULT_VALUE);

interface SoundEffectsProviderProps {
	enabled: boolean;
	children: ReactNode;
}

function SoundEffectsProvider({
	enabled,
	children,
}: SoundEffectsProviderProps) {
	const handlers = useSoundEffects({ enabled });
	const value = useMemo(() => ({ ...handlers, enabled }), [handlers, enabled]);

	return (
		<SoundEffectsContext.Provider value={value}>
			{children}
		</SoundEffectsContext.Provider>
	);
}

function useSoundEffectsContext() {
	return useContext(SoundEffectsContext);
}

export { SoundEffectsProvider, useSoundEffectsContext };
