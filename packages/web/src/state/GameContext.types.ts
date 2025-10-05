import type { EngineContext } from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/contents';
import type { Action } from './actionTypes';
import type { PhaseStep } from './phaseTypes';
import type { TimeScale } from './useTimeScale';
import type { HoverCard } from './useHoverCard';
import type { LogEntry } from './useGameLog';
import type { ErrorToast } from './useErrorToasts';

export interface GameEngineContextValue {
	ctx: EngineContext;
	log: LogEntry[];
	logOverflowed: boolean;
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
