import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { TranslationContext } from '../translation/context';
import type { SessionView } from './sessionSelectors';
import type { Action } from './actionTypes';
import type { TimeScale } from './useTimeScale';
import type { HoverCard } from './useHoverCard';
import type { LogEntry } from './useGameLog';
import type { Toast } from './useToasts';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';
import type { LegacySession, SessionResourceKey } from './sessionTypes';

export interface PhaseStep {
	title: string;
	items: { text: string; italic?: boolean; done?: boolean }[];
	active: boolean;
}

export interface PerformActionRequest {
	action: Action;
	params?: Record<string, unknown>;
}

export type PerformActionHandler = (
	request: PerformActionRequest,
) => Promise<void>;

export type AdvancePhaseHandler = () => Promise<void>;

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
	log: LogEntry[];
	logOverflowed: boolean;
	resolution: ActionResolution | null;
	showResolution: (options: ShowResolutionOptions) => Promise<void>;
	acknowledgeResolution: () => void;
	hoverCard: HoverCard | null;
	handleHoverCard: (data: HoverCard) => void;
	clearHoverCard: () => void;
	phaseSteps: PhaseStep[];
	setPhaseSteps: React.Dispatch<React.SetStateAction<PhaseStep[]>>;
	phaseTimer: number;
	mainApStart: number;
	displayPhase: string;
	setDisplayPhase: (id: string) => void;
	phaseHistories: Record<string, PhaseStep[]>;
	tabsEnabled: boolean;
	actionCostResource: SessionResourceKey;
	requests: {
		performAction: PerformActionHandler;
		advancePhase: AdvancePhaseHandler;
		refreshSession: RefreshSessionHandler;
	};
	metadata: SessionMetadataFetchers;
	runUntilActionPhase: () => Promise<void>;
	updateMainPhaseStep: (apStartOverride?: number) => void;
	onExit?: () => void;
	darkMode: boolean;
	onToggleDark: () => void;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
	backgroundAudioMuted: boolean;
	onToggleBackgroundAudioMute: () => void;
	timeScale: TimeScale;
	setTimeScale: (value: TimeScale) => void;
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

export interface LegacyGameEngineContextBridge {
	/**
	 * TODO(#session-migration): Remove direct EngineSession exposure once
	 * all consumers rely on request helpers.
	 */
	session: LegacySession;
	/**
	 * TODO(#session-migration): Replace with `sessionSnapshot` in consuming
	 * modules after the serialization audit completes.
	 */
	sessionState: SessionSnapshot;
	/**
	 * TODO(#session-migration): Read from `selectors.sessionView` instead.
	 */
	sessionView: SessionView;
	/**
	 * TODO(#session-migration): Use `requests.performAction`.
	 */
	handlePerform: (
		action: Action,
		params?: Record<string, unknown>,
	) => Promise<void>;
	/**
	 * TODO(#session-migration): Use `requests.advancePhase`.
	 */
	handleEndTurn: () => Promise<void>;
}

export type LegacyGameEngineContextValue = GameEngineContextValue &
	LegacyGameEngineContextBridge;
