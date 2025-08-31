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
  Resource,
} from '@kingdom-builder/contents';
import {
  snapshotPlayer,
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
        rules: RULES,
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
  const enqueue = <T,>(task: () => Promise<T> | T) => ctx.enqueue(task);

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
  ) => {
    const p = player ?? ctx.activePlayer;
    setLog((prev) => {
      const items = (Array.isArray(entry) ? entry : [entry]).map((text) => ({
        time: new Date().toLocaleTimeString(),
        text: `[${p.name}] ${text}`,
        playerId: p.id,
      }));
      return [...prev, ...items];
    });
  };

  useEffect(() => {
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
      const lines = diffStepSnapshots(before, after, undefined, ctx);
      if (lines.length)
        addLog(
          ['Last-player compensation:', ...lines.map((l: string) => `  ${l}`)],
          player,
        );
    });
  }, [ctx]);

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

  async function runUntilActionPhaseCore() {
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
    setMainApStart(ctx.activePlayer.ap as number);
    updateMainPhaseStep(ctx.activePlayer.ap as number);
    setDisplayPhase(ctx.game.currentPhase);
    setTabsEnabled(true);
    refresh();
  }

  const runUntilActionPhase = () => enqueue(runUntilActionPhaseCore);

  function perform(action: Action, params?: Record<string, unknown>) {
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

      const after = snapshotPlayer(player, ctx);
      const stepDef = ctx.actions.get(action.id);
      const changes = diffStepSnapshots(before, after, stepDef, ctx);
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

      const subLines: string[] = [];
      for (const trace of traces) {
        const subStep = ctx.actions.get(trace.id);
        const subChanges = diffStepSnapshots(
          trace.before,
          trace.after,
          subStep,
          ctx,
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

      const normalize = (line: string) =>
        (line.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();
      const subPrefixes = subLines.map(normalize);

      const costLabels = new Set(
        Object.keys(costs) as (keyof typeof RESOURCES)[],
      );
      const filtered = changes.filter((line) => {
        if (subPrefixes.includes(normalize(line))) return false;
        for (const key of costLabels) {
          const info = RESOURCES[key];
          const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
          if (line.startsWith(prefix)) return false;
        }
        return true;
      });
      addLog([...messages, ...filtered.map((c) => `  ${c}`)], player);
    } catch (e) {
      const icon = ctx.actions.get(action.id)?.icon || '';
      addLog(
        `Failed to play ${icon} ${action.name}: ${(e as Error).message}`,
        player,
      );
      return;
    }
    updateMainPhaseStep();
    refresh();
  }

  const handlePerform = (action: Action, params?: Record<string, unknown>) =>
    enqueue(() => perform(action, params));

  async function endTurn() {
    const phaseDef = ctx.phases[ctx.game.phaseIndex];
    if (!phaseDef?.action) return;
    if (ctx.activePlayer.ap > 0) return;
    advance(ctx);
    setPhaseHistories({});
    await runUntilActionPhaseCore();
  }

  const handleEndTurn = () => enqueue(endTurn);

  // Update main phase steps once action phase becomes active
  useEffect(() => {
    if (ctx.phases[ctx.game.phaseIndex]?.action) {
      setMainApStart(ctx.activePlayer.ap as number);
      updateMainPhaseStep(ctx.activePlayer.ap as number);
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
    const active = ctx.activePlayer;
    const taxName = ctx.actions.get('tax').name;
    if (active.id === playerB.id) {
      const ap = active.ap as number;
      for (let i = 0; i < ap; i++) {
        void enqueue(() => perform({ id: 'tax', name: taxName, system: true }));
      }
      void enqueue(endTurn);
    } else if (active.id === playerA.id && active.ap === 0) {
      void enqueue(endTurn);
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
