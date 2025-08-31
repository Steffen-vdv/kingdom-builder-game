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
  Resource,
  getActionCosts,
  type EngineContext,
  type ActionParams,
} from '@kingdom-builder/engine';
import {
  RESOURCES,
  ACTION_INFO as actionInfo,
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
} from '@kingdom-builder/contents';
import {
  snapshotPlayer,
  diffSnapshots,
  diffStepSnapshots,
  logContent,
  type Summary,
} from '../translation';

interface Action {
  id: string;
  name: string;
  system?: boolean;
}

type LogEntry = {
  time: string;
  text: string;
  playerId: string;
};

interface HoverCard {
  title: string;
  effects: Summary;
  requirements: string[];
  costs?: Record<string, number>;
  description?: string;
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
  hoverCard: HoverCard | null;
  handleHoverCard: (data: HoverCard) => void;
  clearHoverCard: () => void;
  phaseSteps: PhaseStep[];
  setPhaseSteps: React.Dispatch<React.SetStateAction<PhaseStep[]>>;
  phaseTimer: number;
  phasePaused: boolean;
  setPaused: (v: boolean) => void;
  mainApStart: number;
  displayPhase: string;
  setDisplayPhase: (id: string) => void;
  phaseHistories: Record<string, PhaseStep[]>;
  tabsEnabled: boolean;
  handlePerform: (action: Action, params?: Record<string, unknown>) => void;
  runUntilActionPhase: () => Promise<void>;
  handleEndTurn: () => Promise<void>;
  updateMainPhaseStep: (apStartOverride?: number) => void;
  onExit?: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  devMode: boolean;
  onToggleDev: () => void;
}

const GameEngineContext = createContext<GameEngineContextValue | null>(null);

export function GameProvider({
  children,
  onExit,
  darkMode = true,
  onToggleDark = () => {},
}: {
  children: React.ReactNode;
  onExit?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}) {
  const ctx = useMemo<EngineContext>(
    () =>
      createEngine({
        actions: ACTIONS,
        buildings: BUILDINGS,
        developments: DEVELOPMENTS,
        populations: POPULATIONS,
        phases: PHASES,
        start: GAME_START,
      }),
    [],
  );
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const [log, setLog] = useState<LogEntry[]>([]);
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const hoverTimeout = useRef<number>();

  const [phaseSteps, setPhaseSteps] = useState<PhaseStep[]>([]);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [phasePaused, setPhasePaused] = useState(false);
  const phasePausedRef = useRef(false);
  const [devMode, setDevMode] = useState(true);
  const onToggleDev = () => setDevMode((d) => !d);
  const [mainApStart, setMainApStart] = useState(0);
  const [displayPhase, setDisplayPhase] = useState(ctx.game.currentPhase);
  const [phaseHistories, setPhaseHistories] = useState<
    Record<string, PhaseStep[]>
  >({});
  const [tabsEnabled, setTabsEnabled] = useState(false);

  const actionPhaseId = useMemo(
    () => ctx.phases.find((p) => p.action)?.id,
    [ctx],
  );

  function setPaused(v: boolean) {
    phasePausedRef.current = v;
    setPhasePaused(v);
  }

  const addLog = (
    entry: string | string[],
    player?: EngineContext['activePlayer'],
  ) =>
    setLog((prev) => {
      const p = player ?? ctx.activePlayer;
      const items = (Array.isArray(entry) ? entry : [entry]).map((text) => ({
        time: new Date().toLocaleTimeString(),
        text: `[${p.name}] ${text}`,
        playerId: p.id,
      }));
      return [...prev, ...items];
    });

  function handleHoverCard(data: HoverCard) {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    hoverTimeout.current = window.setTimeout(() => setHoverCard(data), 300);
  }
  function clearHoverCard() {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    setHoverCard(null);
  }

  function updateMainPhaseStep(apStartOverride?: number) {
    const total = apStartOverride ?? mainApStart;
    const spent = total - ctx.activePlayer.ap;
    const steps = [
      {
        title: 'Step 1 - Spend all AP',
        items: [
          {
            text: `${RESOURCES[Resource.ap].icon} ${spent}/${total} spent`,
            done: ctx.activePlayer.ap === 0,
          },
        ],
        active: ctx.activePlayer.ap > 0,
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
    const speed = devMode ? 0.01 : 1;
    const adjustedTotal = total * speed;
    const step = 100 * speed;
    setPhaseTimer(0);
    return new Promise<void>((resolve) => {
      let elapsed = 0;
      const interval = window.setInterval(() => {
        if (!phasePausedRef.current) {
          elapsed += step;
          setPhaseTimer(elapsed / adjustedTotal);
          if (elapsed >= adjustedTotal) {
            window.clearInterval(interval);
            setPhaseTimer(0);
            resolve();
          }
        }
      }, step);
    });
  }

  function runStepDelay() {
    return runDelay(1000);
  }

  async function runUntilActionPhase() {
    setTabsEnabled(false);
    setPhaseSteps([]);
    setDisplayPhase(ctx.game.currentPhase);
    setPhaseHistories({});
    let lastPhase: string | null = null;
    while (!ctx.phases[ctx.game.phaseIndex]?.action) {
      const before = snapshotPlayer(ctx.activePlayer, ctx);
      const { phase, step, player } = advance(ctx);
      const phaseDef = ctx.phases.find((p) => p.id === phase)!;
      const stepDef = phaseDef.steps.find((s) => s.id === step);
      if (phase !== lastPhase) {
        await runDelay(1500);
        setPhaseSteps([]);
        setDisplayPhase(phase);
        addLog(`${phaseDef.icon} ${phaseDef.label} Phase`, player);
        lastPhase = phase;
      }
      const after = snapshotPlayer(player, ctx);
      const changes = diffStepSnapshots(before, after, stepDef, ctx);
      if (changes.length) {
        addLog(
          changes.map((c) => `  ${c}`),
          player,
        );
      }
      const entry = {
        title: stepDef?.title || step,
        items:
          changes.length > 0
            ? changes.map((text) => ({ text }))
            : [{ text: 'No effect', italic: true }],
        active: false,
      };
      setPhaseSteps((prev) => [...prev, entry]);
      setPhaseHistories((prev) => ({
        ...prev,
        [phase]: [...(prev[phase] ?? []), entry],
      }));
      await runStepDelay();
    }
    await runDelay(1500);
    setMainApStart(ctx.activePlayer.ap);
    updateMainPhaseStep(ctx.activePlayer.ap);
    setDisplayPhase(ctx.game.currentPhase);
    setTabsEnabled(true);
    refresh();
  }

  function handlePerform(action: Action, params?: Record<string, unknown>) {
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    const costs = getActionCosts(
      action.id,
      ctx,
      params as ActionParams<string>,
    );
    try {
      performAction(action.id, ctx, params as ActionParams<string>);
      const after = snapshotPlayer(ctx.activePlayer, ctx);
      const changes = diffSnapshots(before, after, ctx);
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
      const costLabels = new Set(
        Object.keys(costs) as (keyof typeof RESOURCES)[],
      );
      const filtered = changes.filter((line) => {
        for (const key of costLabels) {
          const info = RESOURCES[key];
          const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
          if (line.startsWith(prefix)) return false;
        }
        return true;
      });
      addLog([...messages, ...filtered.map((c) => `  ${c}`)]);
    } catch (e) {
      const icon = actionInfo[action.id]?.icon || '';
      addLog(`Failed to play ${icon} ${action.name}: ${(e as Error).message}`);
      return;
    }
    updateMainPhaseStep();
    refresh();
  }

  async function handleEndTurn() {
    const phaseDef = ctx.phases[ctx.game.phaseIndex];
    if (!phaseDef?.action) return;
    if (ctx.activePlayer.ap > 0) return;
    advance(ctx);
    setPhaseHistories({});
    await runUntilActionPhase();
  }

  // Update main phase steps once action phase becomes active
  useEffect(() => {
    if (ctx.phases[ctx.game.phaseIndex]?.action) {
      setMainApStart(ctx.activePlayer.ap);
      updateMainPhaseStep(ctx.activePlayer.ap);
    }
  }, [ctx.game.phaseIndex]);

  useEffect(() => {
    void runUntilActionPhase();
  }, []);

  useEffect(() => {
    if (!devMode) return;
    const phaseDef = ctx.phases[ctx.game.phaseIndex];
    if (!phaseDef?.action) return;
    const playerA = ctx.game.players[0]!;
    const playerB = ctx.game.players[1]!;
    if (ctx.activePlayer.id === playerB.id) {
      while (ctx.activePlayer.ap > 0) {
        handlePerform({
          id: 'tax',
          name: actionInfo['tax']!.label,
          system: true,
        });
      }
      void handleEndTurn();
    } else if (
      ctx.activePlayer.id === playerA.id &&
      ctx.activePlayer.ap === 0
    ) {
      void handleEndTurn();
    }
  }, [devMode, ctx.game.phaseIndex, ctx.activePlayer.id, ctx.activePlayer.ap]);

  const value: GameEngineContextValue = {
    ctx,
    log,
    hoverCard,
    handleHoverCard,
    clearHoverCard,
    phaseSteps,
    setPhaseSteps,
    phaseTimer,
    phasePaused,
    setPaused,
    mainApStart,
    displayPhase,
    setDisplayPhase,
    phaseHistories,
    tabsEnabled,
    handlePerform,
    runUntilActionPhase,
    handleEndTurn,
    updateMainPhaseStep,
    darkMode,
    onToggleDark,
    devMode,
    onToggleDev,
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

export type { LogEntry, PhaseStep };
