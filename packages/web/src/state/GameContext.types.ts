import type {
	SessionRequirementFailure,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { TranslationContext } from '../translation/context';
import type { SessionView } from './sessionSelectors';
import type { Action } from './actionTypes';
import type { PhaseProgressState } from './usePhaseProgress';
import type { TimeScale } from './useTimeScale';
import type { HoverCard } from './useHoverCard';
import type { LogEntry } from './useGameLog';
import type { Toast } from './useToasts';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';
import type { ReactNode } from 'react';
import type {
	SessionMetadata,
	SessionRegistries,
	SessionResourceKey,
	SessionResourceKeys,
} from './sessionTypes';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';

export interface SessionContainer {
	sessionId: string;
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
	metadata: SessionMetadata;
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
	playerName?: string;
	onChangePlayerName?: (name: string) => void;
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

export interface SessionEvaluationApi {
	getActionCosts<T extends string>(
		actionId: T,
		params?: Record<string, unknown>,
	): Record<string, number>;
	getActionRequirements<T extends string>(
		actionId: T,
		params?: Record<string, unknown>,
	): SessionRequirementFailure[];
	getActionOptions(actionId: string): ActionEffectGroup[];
}

export interface GameEngineContextValue {
	sessionId: string;
	sessionSnapshot: SessionSnapshot;
	cachedSessionSnapshot: SessionSnapshot;
	sessionState: SessionSnapshot;
	sessionView: SessionView;
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
	phase: PhaseProgressState;
	actionCostResource: SessionResourceKey;
	requests: {
		performAction: PerformActionHandler;
		advancePhase: AdvancePhaseHandler;
		refreshSession: RefreshSessionHandler;
	};
	handlePerform: (
		action: Action,
		params?: Record<string, unknown>,
	) => Promise<void>;
	handleEndTurn: () => Promise<void>;
	session: SessionEvaluationApi;
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

export type LegacyGameEngineContextValue = GameEngineContextValue;
