import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { TranslationContext } from '../translation/context';
import type { SessionView } from './sessionSelectors';
import type { Action } from './actionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import type { TimeScale } from './useTimeScale';
import type { ControlId, ControlKeybindMap } from './keybindings';
import type { HoverCard } from './useHoverCard';
import type { ResolutionLogEntry } from './useGameLog';
import type { Toast } from './useToasts';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';
import type { ReactNode } from 'react';
import type {
	RemoteSessionRecord,
	Session,
	SessionResourceKey,
} from './sessionTypes';
import type { ResumeSessionRecord } from './sessionResumeStorage';

export interface SessionContainer
	extends Omit<RemoteSessionRecord, 'queueSeed'> {
	adapter: Session;
}

export interface GameProviderProps {
	children: ReactNode;
	onExit?: () => void;
	darkMode?: boolean;
	onToggleDark?: () => void;
	devMode?: boolean;
	musicEnabled?: boolean;
	onToggleMusic?: () => void;
	soundEnabled?: boolean;
	onToggleSound?: () => void;
	backgroundAudioMuted?: boolean;
	onToggleBackgroundAudioMute?: () => void;
	autoAcknowledgeEnabled?: boolean;
	onToggleAutoAcknowledge?: () => void;
	autoPassEnabled?: boolean;
	onToggleAutoPass?: () => void;
	playerName?: string;
	onChangePlayerName?: (name: string) => void;
	resumeSessionId?: string | null;
	onPersistResumeSession?: (record: ResumeSessionRecord) => void;
	onClearResumeSession?: (sessionId?: string | null) => void;
	onResumeSessionFailure?: (options: ResumeSessionFailureOptions) => void;
}

export interface ResumeSessionFailureOptions {
	sessionId: string;
	error: unknown;
}

export interface PerformActionRequest {
	action: Action;
	params?: Record<string, unknown>;
}

export type PerformActionHandler = (
	request: PerformActionRequest,
) => Promise<void>;

export type AdvancePhaseHandler = () => Promise<void>;

export type StartSessionHandler = () => Promise<void>;

export type RefreshSessionHandler = () => Promise<void>;

export interface SessionMetadataFetchers {
	getRuleSnapshot: () => SessionRuleSnapshot;
	getSessionView: () => SessionView;
	getTranslationContext: () => TranslationContext;
}

export interface SessionDerivedSelectors {
	sessionView: SessionView;
}

export interface GameEngineContextValue {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	cachedSessionSnapshot: SessionSnapshot;
	selectors: SessionDerivedSelectors;
	translationContext: TranslationContext;
	ruleSnapshot: SessionRuleSnapshot;
	log: ResolutionLogEntry[];
	logOverflowed: boolean;
	resolution: ActionResolution | null;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	acknowledgeResolution: () => void;
	hoverCard: HoverCard | null;
	handleHoverCard: (data: HoverCard) => void;
	clearHoverCard: () => void;
	phase: PhaseProgressState;
	actionCostResource: SessionResourceKey;
	requests: {
		performAction: PerformActionHandler;
		advancePhase: AdvancePhaseHandler;
		startSession: StartSessionHandler;
		refreshSession: RefreshSessionHandler;
	};
	metadata: SessionMetadataFetchers;
	runUntilActionPhase: () => Promise<void>;
	refreshPhaseState: (overrides?: Partial<PhaseProgressState>) => void;
	onExit?: () => void;
	darkMode: boolean;
	onToggleDark: () => void;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
	backgroundAudioMuted: boolean;
	onToggleBackgroundAudioMute: () => void;
	autoAcknowledgeEnabled: boolean;
	onToggleAutoAcknowledge: () => void;
	autoPassEnabled: boolean;
	onToggleAutoPass: () => void;
	timeScale: TimeScale;
	setTimeScale: (value: TimeScale) => void;
	controlKeybinds: ControlKeybindMap;
	setControlKeybind: (controlId: ControlId, value: string) => void;
	resetControlKeybind: (controlId: ControlId) => void;
	toasts: Toast[];
	pushToast: (options: {
		message: string;
		title?: string;
		variant: Toast['variant'];
	}) => void;
	pushErrorToast: (message: string, title?: string) => void;
	pushSuccessToast: (message: string, title?: string) => void;
	dismissToast: (id: number) => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
}
