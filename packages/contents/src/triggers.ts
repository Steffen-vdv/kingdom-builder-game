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
  onAttackResolved: {
    icon: '⚔️',
    future: 'After having been attacked',
    past: 'After attack',
  },
  mainPhase: {
    icon: PHASES.find((p) => p.id === 'main')?.icon || '🎯',
    future: '',
    past: `${PHASES.find((p) => p.id === 'main')?.label || 'Main'} phase`,
  },
  ...phaseTriggers,
} as const;
