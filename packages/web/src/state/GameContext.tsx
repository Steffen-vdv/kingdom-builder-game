import React, {
	createContext,
	useContext,
	useMemo,
	useRef,
	useState,
	useEffect,
} from 'react';
import {
	createEngine,
	performAction,
	advance,
	getActionCosts,
	type EngineContext,
	type ActionParams,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	type ResourceKey,
	type StepDef,
} from '@kingdom-builder/contents';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
	type Summary,
} from '../translation';
import { describeSkipEvent } from '../utils/describeSkipEvent';
import {
	replaySavedGame,
	saveGame,
	type SavedGame,
	type SavedGameEvent,
} from './persistence';
import type { LogEntry } from './types';

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];
export const TIME_SCALE_OPTIONS = [1, 2, 5, 100] as const;
export type TimeScale = (typeof TIME_SCALE_OPTIONS)[number];
const TIME_SCALE_STORAGE_KEY = 'kingdom-builder:time-scale';
const ACTION_EFFECT_DELAY = 600;
const MAX_LOG_ENTRIES = 250;

function readStoredTimeScale(): TimeScale | null {
	if (typeof window === 'undefined') return null;
	const raw = window.localStorage.getItem(TIME_SCALE_STORAGE_KEY);
	if (!raw) return null;
	const parsed = Number(raw);
	return (TIME_SCALE_OPTIONS as readonly number[]).includes(parsed)
		? (parsed as TimeScale)
		: null;
}

function cloneParams(
	params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
	if (!params) return undefined;
	try {
		return JSON.parse(JSON.stringify(params)) as Record<string, unknown>;
	} catch (error) {
		console.warn('Failed to clone action params for persistence', error);
		return undefined;
	}
}

function cloneEvents(events: SavedGameEvent[]): SavedGameEvent[] {
	return events.map((event) => {
		if (event.type === 'action') {
			const clonedParams = cloneParams(event.params);
			if (clonedParams === undefined) {
				return {
					type: 'action',
					playerId: event.playerId,
					actionId: event.actionId,
				} satisfies SavedGameEvent;
			}
			return {
				type: 'action',
				playerId: event.playerId,
				actionId: event.actionId,
				params: clonedParams,
			} satisfies SavedGameEvent;
		}
		return { ...event } satisfies SavedGameEvent;
	});
}

interface Action {
	id: string;
	name: string;
	system?: boolean;
}

interface HoverCard {
	title: string;
	effects: Summary;
	requirements: string[];
	costs?: Record<string, number>;
	upkeep?: Record<string, number> | undefined;
	description?: string | Summary;
	descriptionTitle?: string;
	descriptionClass?: string;
	effectsTitle?: string;
	bgClass?: string;
}

type PhaseStep = {
	title: string;
	items: { text: string; italic?: boolean; done?: boolean }[];
	active: boolean;
};

interface GameEngineContextValue {
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
	timeScale: TimeScale;
	setTimeScale: (value: TimeScale) => void;
	initialized: boolean;
}

const GameEngineContext = createContext<GameEngineContextValue | null>(null);

export function GameProvider({
	children,
	onExit,
	darkMode = true,
	onToggleDark = () => {},
	devMode = false,
	initialSave = null,
}: {
	children: React.ReactNode;
	onExit?: () => void;
	darkMode?: boolean;
	onToggleDark?: () => void;
	devMode?: boolean;
	initialSave?: SavedGame | null;
}) {
	const ctx = useMemo<EngineContext>(() => {
		const engine = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		engine.game.devMode = devMode;
		return engine;
	}, [devMode]);
	const [, setTick] = useState(0);
	const refresh = () => setTick((t) => t + 1);

	const [log, setLog] = useState<LogEntry[]>(() => initialSave?.log ?? []);
	const [logOverflowed, setLogOverflowed] = useState(
		initialSave?.logOverflowed ?? false,
	);
	const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
	const hoverTimeout = useRef<number>();
	const timeouts = useRef(new Set<number>());
	const intervals = useRef(new Set<number>());
	const isMounted = useRef(true);
	const [phaseSteps, setPhaseSteps] = useState<PhaseStep[]>([]);
	const [phaseTimer, setPhaseTimer] = useState(0);
	const [mainApStart, setMainApStart] = useState(0);
	const [displayPhase, setDisplayPhase] = useState(ctx.game.currentPhase);
	const [phaseHistories, setPhaseHistories] = useState<
		Record<string, PhaseStep[]>
	>({});
	const [tabsEnabled, setTabsEnabled] = useState(false);
	const enqueue = <T,>(task: () => Promise<T> | T) => ctx.enqueue(task);

	const historyRef = useRef<SavedGameEvent[]>(
		initialSave ? cloneEvents(initialSave.events) : [],
	);
	const isReplayingRef = useRef(false);
	const [initialized, setInitialized] = useState(initialSave ? false : true);

	const [timeScale, setTimeScaleState] = useState<TimeScale>(() => {
		if (devMode) return 100;
		return readStoredTimeScale() ?? 1;
	});
	useEffect(() => {
		if (devMode) {
			setTimeScaleState(100);
		} else {
			setTimeScaleState(readStoredTimeScale() ?? 1);
		}
	}, [devMode]);
	const changeTimeScale = (value: TimeScale) => {
		setTimeScaleState((prev) => {
			if (prev === value) return prev;
			if (typeof window !== 'undefined')
				window.localStorage.setItem(TIME_SCALE_STORAGE_KEY, String(value));
			return value;
		});
	};

	const actionCostResource = ctx.actionCostResource as ResourceKey;

	const clearTrackedTimeout = (id: number) => {
		window.clearTimeout(id);
		timeouts.current.delete(id);
	};

	const setTrackedTimeout = (handler: () => void, delay: number) => {
		const timeoutId = window.setTimeout(() => {
			timeouts.current.delete(timeoutId);
			if (!isMounted.current) return;
			handler();
		}, delay);
		timeouts.current.add(timeoutId);
		return timeoutId;
	};

	const clearTrackedInterval = (id: number) => {
		window.clearInterval(id);
		intervals.current.delete(id);
	};

	const setTrackedInterval = (handler: () => void, delay: number) => {
		const intervalId = window.setInterval(() => {
			if (!isMounted.current) {
				clearTrackedInterval(intervalId);
				return;
			}
			handler();
		}, delay);
		intervals.current.add(intervalId);
		return intervalId;
	};

	useEffect(() => {
		return () => {
			isMounted.current = false;
			hoverTimeout.current = undefined;
			timeouts.current.forEach((id) => window.clearTimeout(id));
			intervals.current.forEach((id) => window.clearInterval(id));
			timeouts.current.clear();
			intervals.current.clear();
		};
	}, []);

	const actionPhaseId = useMemo(
		() => ctx.phases.find((p) => p.action)?.id,
		[ctx],
	);

	const commitSave = React.useCallback(() => {
		if (!initialized || isReplayingRef.current) return;
		const snapshot: SavedGame = {
			version: 1,
			events: cloneEvents(historyRef.current),
			turn: ctx.game.turn,
			nextPlayerId: ctx.activePlayer.id,
			log,
			logOverflowed,
			devMode: ctx.game.devMode,
		};
		saveGame(snapshot);
	}, [initialized, ctx, log, logOverflowed]);

	const addLog = (
		entry: string | string[],
		player?: EngineContext['activePlayer'],
	) => {
		const p = player ?? ctx.activePlayer;
		setLog((prev) => {
			const items = (Array.isArray(entry) ? entry : [entry]).map((text) => ({
				time: new Date().toLocaleTimeString(),
				text: `[${p.name}] ${text}`,
				playerId: p.id,
			}));
			const combined = [...prev, ...items];
			const next = combined.slice(-MAX_LOG_ENTRIES);
			if (next.length < combined.length) {
				setLogOverflowed(true);
			}
			return next;
		});
	};

	useEffect(() => {
		if (initialSave) return;
		ctx.game.players.forEach((player) => {
			const comp = ctx.compensations[player.id];
			if (
				!comp ||
				(Object.keys(comp.resources || {}).length === 0 &&
					Object.keys(comp.stats || {}).length === 0)
			)
				return;
			const after = snapshotPlayer(player, ctx);
			const before = {
				...after,
				resources: { ...after.resources },
				stats: { ...after.stats },
				buildings: [...after.buildings],
				lands: after.lands.map((l) => ({
					...l,
					developments: [...l.developments],
				})),
				passives: [...after.passives],
			};
			for (const [k, v] of Object.entries(comp.resources || {}))
				before.resources[k] = (before.resources[k] || 0) - (v ?? 0);
			for (const [k, v] of Object.entries(comp.stats || {}))
				before.stats[k] = (before.stats[k] || 0) - (v ?? 0);
			const lines = diffStepSnapshots(
				before,
				after,
				undefined,
				ctx,
				RESOURCE_KEYS,
			);
			if (lines.length)
				addLog(
					['Last-player compensation:', ...lines.map((l: string) => `  ${l}`)],
					player,
				);
		});
	}, [ctx, initialSave]);

	useEffect(() => {
		if (!initialSave) return;
		historyRef.current = cloneEvents(initialSave.events);
		try {
			isReplayingRef.current = true;
			replaySavedGame(ctx, initialSave);
		} catch (error) {
			console.error('Failed to replay saved game', error);
		} finally {
			isReplayingRef.current = false;
			setInitialized(true);
		}
	}, [ctx, initialSave]);

	function handleHoverCard(data: HoverCard) {
		if (hoverTimeout.current) {
			clearTrackedTimeout(hoverTimeout.current);
		}
		hoverTimeout.current = setTrackedTimeout(() => {
			hoverTimeout.current = undefined;
			setHoverCard(data);
		}, 300);
	}
	function clearHoverCard() {
		if (hoverTimeout.current) {
			clearTrackedTimeout(hoverTimeout.current);
			hoverTimeout.current = undefined;
		}
		setHoverCard(null);
	}

	function updateMainPhaseStep(apStartOverride?: number) {
		const total = apStartOverride ?? mainApStart;
		const remaining = ctx.activePlayer.resources[actionCostResource] ?? 0;
		const spent = total - remaining;
		const steps = [
			{
				title: `Step 1 - Spend all ${RESOURCES[actionCostResource]?.label ?? ''}`,
				items: [
					{
						text: `${RESOURCES[actionCostResource]?.icon ?? ''} ${spent}/${total} spent`,
						done: remaining === 0,
					},
				],
				active: remaining > 0,
			},
		];
		setPhaseSteps(steps);
		if (actionPhaseId) {
			setPhaseHistories((prev) => ({ ...prev, [actionPhaseId]: steps }));
			setDisplayPhase(actionPhaseId);
		} else {
			setDisplayPhase(ctx.game.currentPhase);
		}
	}

	function runDelay(total: number) {
		const scale = timeScale || 1;
		const adjustedTotal = total / scale;
		if (adjustedTotal <= 0) {
			if (isMounted.current) setPhaseTimer(0);
			return Promise.resolve();
		}
		const tick = Math.max(16, Math.min(100, adjustedTotal / 10));
		if (isMounted.current) setPhaseTimer(0);
		return new Promise<void>((resolve) => {
			let elapsed = 0;
			const interval = setTrackedInterval(() => {
				elapsed += tick;
				if (isMounted.current)
					setPhaseTimer(Math.min(1, elapsed / adjustedTotal));
				if (elapsed >= adjustedTotal) {
					clearTrackedInterval(interval);
					if (isMounted.current) setPhaseTimer(0);
					resolve();
				}
			}, tick);
		});
	}

	function runStepDelay() {
		return runDelay(1000);
	}

	async function runUntilActionPhaseCore() {
		if (ctx.phases[ctx.game.phaseIndex]?.action) {
			if (!isMounted.current) return;
			setPhaseTimer(0);
			setTabsEnabled(true);
			setDisplayPhase(ctx.game.currentPhase);
			return;
		}
		setTabsEnabled(false);
		setPhaseSteps([]);
		setDisplayPhase(ctx.game.currentPhase);
		setPhaseHistories({});
		let ranSteps = false;
		let lastPhase: string | null = null;
		while (!ctx.phases[ctx.game.phaseIndex]?.action) {
			ranSteps = true;
			const before = snapshotPlayer(ctx.activePlayer, ctx);
			const { phase, step, player, effects, skipped } = advance(ctx);
			const phaseDef = ctx.phases.find((p) => p.id === phase)!;
			const stepDef = phaseDef.steps.find((s) => s.id === step);
			if (phase !== lastPhase) {
				await runDelay(1500);
				if (!isMounted.current) return;
				setPhaseSteps([]);
				setDisplayPhase(phase);
				addLog(`${phaseDef.icon} ${phaseDef.label} Phase`, player);
				lastPhase = phase;
			}
			const phaseId = phase;
			let entry: {
				title: string;
				items: { text: string; italic?: boolean }[];
				active: true;
			};
			if (skipped) {
				const summary = describeSkipEvent(skipped, phaseDef, stepDef);
				addLog(summary.logLines, player);
				entry = {
					title: summary.history.title,
					items: summary.history.items,
					active: true,
				};
			} else {
				const after = snapshotPlayer(player, ctx);
				const stepWithEffects: StepDef | undefined = stepDef
					? ({ ...(stepDef as StepDef), effects } as StepDef)
					: undefined;
				const changes = diffStepSnapshots(
					before,
					after,
					stepWithEffects,
					ctx,
					RESOURCE_KEYS,
				);
				if (changes.length) {
					addLog(
						changes.map((c) => `  ${c}`),
						player,
					);
				}
				entry = {
					title: stepDef?.title || step,
					items:
						changes.length > 0
							? changes.map((text) => ({ text }))
							: [{ text: 'No effect', italic: true }],
					active: true,
				};
			}
			setPhaseSteps((prev) => [...prev, entry]);
			setPhaseHistories((prev) => ({
				...prev,
				[phaseId]: [...(prev[phaseId] ?? []), entry],
			}));
			await runStepDelay();
			if (!isMounted.current) return;
			const finalized = { ...entry, active: false };
			setPhaseSteps((prev) => {
				if (!prev.length) return prev;
				const next = [...prev];
				next[next.length - 1] = finalized;
				return next;
			});
			setPhaseHistories((prev) => {
				const history = prev[phaseId];
				if (!history?.length) return prev;
				const nextHistory = [...history];
				nextHistory[nextHistory.length - 1] = finalized;
				return { ...prev, [phaseId]: nextHistory };
			});
		}
		if (ranSteps) {
			await runDelay(1500);
			if (!isMounted.current) return;
		} else {
			if (!isMounted.current) return;
			setPhaseTimer(0);
		}
		const start = ctx.activePlayer.resources[actionCostResource] as number;
		if (!isMounted.current) return;
		setMainApStart(start);
		updateMainPhaseStep(start);
		setDisplayPhase(ctx.game.currentPhase);
		setTabsEnabled(true);
		refresh();
	}

	const runUntilActionPhase = () => enqueue(runUntilActionPhaseCore);

	function waitWithScale(base: number) {
		const scale = timeScale || 1;
		const duration = base / scale;
		if (duration <= 0) return Promise.resolve();
		return new Promise<void>((resolve) => {
			setTrackedTimeout(() => resolve(), duration);
		});
	}

	async function logWithEffectDelay(
		lines: string[],
		player: EngineContext['activePlayer'],
	) {
		if (!lines.length) return;
		const [first, ...rest] = lines;
		if (first === undefined) return;
		if (!isMounted.current) return;
		addLog(first, player);
		const delay = ACTION_EFFECT_DELAY;
		for (const line of rest) {
			await waitWithScale(delay);
			if (!isMounted.current) return;
			addLog(line, player);
		}
	}

	async function perform(action: Action, params?: Record<string, unknown>) {
		const player = ctx.activePlayer;
		const before = snapshotPlayer(player, ctx);
		const costs = getActionCosts(
			action.id,
			ctx,
			params as ActionParams<string>,
		);
		try {
			const traces = performAction(
				action.id,
				ctx,
				params as ActionParams<string>,
			);

			if (!isReplayingRef.current) {
				const clonedParams = cloneParams(params);
				const event: SavedGameEvent = {
					type: 'action',
					playerId: player.id,
					actionId: action.id,
				};
				if (clonedParams !== undefined) {
					event.params = clonedParams;
				}
				historyRef.current.push(event);
			}

			const after = snapshotPlayer(player, ctx);
			const stepDef = ctx.actions.get(action.id);
			const changes = diffStepSnapshots(
				before,
				after,
				stepDef,
				ctx,
				RESOURCE_KEYS,
			);
			const messages = logContent('action', action.id, ctx, params);
			const costLines: string[] = [];
			for (const key of Object.keys(costs) as (keyof typeof RESOURCES)[]) {
				const amt = costs[key] ?? 0;
				if (!amt) continue;
				const info = RESOURCES[key];
				const icon = info?.icon ? `${info.icon} ` : '';
				const label = info?.label ?? key;
				const b = before.resources[key] ?? 0;
				const a = b - amt;
				costLines.push(`    ${icon}${label} -${amt} (${b}→${a})`);
			}
			if (costLines.length) {
				messages.splice(1, 0, '  💲 Action cost', ...costLines);
			}

			const normalize = (line: string) =>
				(line.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();

			const subLines: string[] = [];
			for (const trace of traces) {
				const subStep = ctx.actions.get(trace.id);
				const subChanges = diffStepSnapshots(
					trace.before,
					trace.after,
					subStep,
					ctx,
					RESOURCE_KEYS,
				);
				if (!subChanges.length) continue;
				subLines.push(...subChanges);
				const icon = ctx.actions.get(trace.id)?.icon || '';
				const name = ctx.actions.get(trace.id).name;
				const line = `  ${icon} ${name}`;
				const idx = messages.indexOf(line);
				if (idx !== -1)
					messages.splice(idx + 1, 0, ...subChanges.map((c) => `    ${c}`));
			}

			const subPrefixes = subLines.map(normalize);

			const messagePrefixes = new Set<string>();
			for (const line of messages) {
				const trimmed = line.trim();
				if (!trimmed.startsWith('You:') && !trimmed.startsWith('Opponent:'))
					continue;
				const body = trimmed.slice(trimmed.indexOf(':') + 1).trim();
				const normalized = normalize(body);
				if (normalized) messagePrefixes.add(normalized);
			}

			const costLabels = new Set(
				Object.keys(costs) as (keyof typeof RESOURCES)[],
			);
			const filtered = changes.filter((line) => {
				const normalizedLine = normalize(line);
				if (messagePrefixes.has(normalizedLine)) return false;
				if (subPrefixes.includes(normalizedLine)) return false;
				for (const key of costLabels) {
					const info = RESOURCES[key];
					const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
					if (line.startsWith(prefix)) return false;
				}
				return true;
			});
			const logLines = [...messages, ...filtered.map((c) => `  ${c}`)];

			updateMainPhaseStep();
			refresh();

			await logWithEffectDelay(logLines, player);

			if (!isMounted.current) return;
			if (
				ctx.game.devMode &&
				(ctx.activePlayer.resources[actionCostResource] ?? 0) <= 0
			) {
				await endTurn();
			}
		} catch (e) {
			const icon = ctx.actions.get(action.id)?.icon || '';
			addLog(
				`Failed to play ${icon} ${action.name}: ${(e as Error).message}`,
				player,
			);
			return;
		}
	}

	const handlePerform = (action: Action, params?: Record<string, unknown>) =>
		enqueue(() => perform(action, params));

	const performRef = useRef<typeof perform>(perform);
	useEffect(() => {
		performRef.current = perform;
	}, [perform]);

	async function endTurn() {
		const phaseDef = ctx.phases[ctx.game.phaseIndex];
		if (!phaseDef?.action) return;
		if ((ctx.activePlayer.resources[actionCostResource] ?? 0) > 0) return;
		const endedPlayerId = ctx.activePlayer.id;
		advance(ctx);
		setPhaseHistories({});
		await runUntilActionPhaseCore();
		if (!isReplayingRef.current) {
			historyRef.current.push({
				type: 'end-turn',
				playerId: endedPlayerId,
			});
			commitSave();
		}
	}

	const handleEndTurn = () => enqueue(endTurn);

	// Update main phase steps once action phase becomes active
	useEffect(() => {
		if (!initialized) return;
		if (!tabsEnabled) return;
		if (!ctx.phases[ctx.game.phaseIndex]?.action) return;
		const start = ctx.activePlayer.resources[actionCostResource] as number;
		setMainApStart(start);
		updateMainPhaseStep(start);
	}, [ctx.game.phaseIndex, tabsEnabled, initialized]);

	useEffect(() => {
		if (!initialized) return;
		void runUntilActionPhase();
	}, [initialized]);

	useEffect(() => {
		if (!initialized) return;
		const phaseDef = ctx.phases[ctx.game.phaseIndex];
		if (!phaseDef?.action) return;
		const aiSystem = ctx.aiSystem;
		const activeId = ctx.activePlayer.id;
		if (!aiSystem?.has(activeId)) return;
		void ctx.enqueue(async () => {
			await aiSystem.run(activeId, ctx, {
				performAction: async (
					actionId: string,
					engineCtx: EngineContext,
					params?: ActionParams<string>,
				) => {
					const definition = engineCtx.actions.get(actionId);
					if (!definition)
						throw new Error(`Unknown action ${String(actionId)} for AI`);
					const action: Action = {
						id: definition.id,
						name: definition.name,
					};
					if (definition.system !== undefined)
						action.system = definition.system;
					await performRef.current(action, params as Record<string, unknown>);
				},
				advance: (engineCtx: EngineContext) => {
					advance(engineCtx);
				},
			});
			if (!isMounted.current) return;
			setPhaseHistories({});
			await runUntilActionPhaseCore();
		});
	}, [
		ctx.aiSystem,
		ctx.game.phaseIndex,
		ctx.activePlayer.id,
		ctx,
		initialized,
	]);

	const value: GameEngineContextValue = {
		ctx,
		log,
		logOverflowed,
		hoverCard,
		handleHoverCard,
		clearHoverCard,
		phaseSteps,
		setPhaseSteps,
		phaseTimer,
		mainApStart,
		displayPhase,
		setDisplayPhase,
		phaseHistories,
		tabsEnabled,
		actionCostResource,
		handlePerform,
		runUntilActionPhase,
		handleEndTurn,
		updateMainPhaseStep,
		darkMode,
		onToggleDark,
		timeScale,
		setTimeScale: changeTimeScale,
		initialized,
		...(onExit ? { onExit } : {}),
	};

	return (
		<GameEngineContext.Provider value={value}>
			{children}
		</GameEngineContext.Provider>
	);
}

export const useGameEngine = (): GameEngineContextValue => {
	const value = useContext(GameEngineContext);
	if (!value) throw new Error('useGameEngine must be used within GameProvider');
	return value;
};
