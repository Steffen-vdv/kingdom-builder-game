import { PopulationRole } from '../state';

export const commander = {
  key: PopulationRole.Commander,
  icon: '🎖️',
  label: 'Army Commander',
  description:
    'Commanders lead your armies in battle. Their presence bolsters Army Strength and can trigger growth effects that steadily expand your military might.',
};
export type CommanderInfo = typeof commander;
