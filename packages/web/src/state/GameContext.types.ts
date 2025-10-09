import type {
	EngineSessionSnapshot,
	EngineSessionGetActionCosts,
	EngineSessionGetActionRequirements,
	RuleSnapshot,
	EngineSession,
} from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/contents';
import type { TranslationContext } from '../translation/context';
import type { SessionView } from './sessionSelectors';
import type { Action } from './actionTypes';
import type { PhaseStep } from './phaseTypes';
import type { TimeScale } from './useTimeScale';
import type { HoverCard } from './useHoverCard';
import type { LogEntry } from './useGameLog';
import type { Toast } from './useToasts';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';

export interface GameEngineContextValue {
	sessionId: string;
	sessionState: EngineSessionSnapshot;
	sessionView: SessionView;
	translationContext: TranslationContext;
	ruleSnapshot: RuleSnapshot;
	getActionCosts: EngineSessionGetActionCosts;
	getActionRequirements: EngineSessionGetActionRequirements;
	getActionOptions: EngineSession['getActionOptions'];
	simulateUpcomingPhases: EngineSession['simulateUpcomingPhases'];
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
	actionCostResource: ResourceKey;
	handlePerform: (
		action: Action,
		params?: Record<string, unknown>,
	) => Promise<void>;
	runUntilActionPhase: () => Promise<void>;
	handleEndTurn: () => Promise<void>;
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
