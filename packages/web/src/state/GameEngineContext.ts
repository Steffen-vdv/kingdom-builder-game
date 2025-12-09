import { createContext } from 'react';
import type { GameEngineContextValue } from './GameContext.types';

/**
 * Context for game engine state. Separated from GameProviderInner to enable
 * Vite Fast Refresh (HMR) — files mixing context exports with component
 * exports break Fast Refresh.
 */
export const GameEngineContext = createContext<GameEngineContextValue | null>(
	null,
);
