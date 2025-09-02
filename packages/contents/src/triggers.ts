import { PHASES } from './phases';

const phaseTriggers = Object.fromEntries(
  PHASES.map((p) => [
    `on${p.id.charAt(0).toUpperCase() + p.id.slice(1)}Phase`,
    {
      icon: p.icon,
      future: `On each ${p.label} Phase`,
      past: `${p.label} Phase`,
    },
  ]),
);

export const TRIGGER_INFO = {
  onBuild: {
    icon: '⚒️',
    future: 'Until removed',
    past: 'Build',
  },
  onBeforeAttacked: {
    icon: '🛡️',
    future: 'Before being attacked',
    past: 'Before attack',
  },
  onAttackResolved: {
    icon: '⚔️',
    future: 'After having been attacked',
    past: 'After attack',
  },
  onPayUpkeepStep: {
    icon: '🧹',
    future: 'During upkeep step',
    past: 'Upkeep step',
  },
  onGainIncomeStep: {
    icon: '💰',
    future: 'During income step',
    past: 'Income step',
  },
  onGainAPStep: {
    icon: '⚡',
    future: 'During AP step',
    past: 'AP step',
  },
  mainPhase: {
    icon: PHASES.find((p) => p.id === 'main')?.icon || '🎯',
    future: '',
    past: `${PHASES.find((p) => p.id === 'main')?.label || 'Main'} phase`,
  },
  ...phaseTriggers,
} as const;
