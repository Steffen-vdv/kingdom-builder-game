import type {
	EngineContext,
	EngineSession,
	EngineSessionSnapshot,
} from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/contents';
import type { TranslationContext } from '../translation/context';
import type { Action } from './actionTypes';
import type { PhaseStep } from './phaseTypes';
import type { TimeScale } from './useTimeScale';
import type { HoverCard } from './useHoverCard';
import type { LogEntry } from './useGameLog';
import type { ErrorToast } from './useErrorToasts';
import type {
	ActionResolution,
	ShowResolutionOptions,
} from './useActionResolution';

export interface GameEngineContextValue {
	session: EngineSession;
	sessionState: EngineSessionSnapshot;
	/** @deprecated Use `session` and `sessionState` instead. */
	ctx: EngineContext;
	translationContext: TranslationContext;
	log: LogEntry[];
	logOverflowed: boolean;
	resolution: ActionResolution | null;
	showResolution: (options: ShowResolutionOptions) => void;
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
	timeScale: TimeScale;
	setTimeScale: (value: TimeScale) => void;
	errorToasts: ErrorToast[];
	pushErrorToast: (message: string) => void;
	dismissErrorToast: (id: number) => void;
}
