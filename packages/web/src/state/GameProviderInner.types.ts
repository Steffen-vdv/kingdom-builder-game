import type { ReactNode } from 'react';
import type {
	SessionQueueHelpers,
	SessionRegistries,
	SessionResourceKeys,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionMetadata,
} from './sessionTypes';

export interface GameProviderInnerProps {
	children: ReactNode;
	onExit?: () => void;
	darkMode: boolean;
	onToggleDark: () => void;
	devMode: boolean;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
	backgroundAudioMuted: boolean;
	onToggleBackgroundAudioMute: () => void;
	autoAdvanceEnabled: boolean;
	onToggleAutoAdvance: () => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
	queue: SessionQueueHelpers;
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	refreshSession: () => Promise<void>;
	onReleaseSession: () => void;
	onAbandonSession?: () => void;
	onFatalSessionError?: (error: unknown) => void;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
	sessionMetadata: SessionMetadata;
}
