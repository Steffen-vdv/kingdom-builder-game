import { PopulationRole } from '../state';

export const council = {
  key: PopulationRole.Council,
  icon: '⚖️',
  label: 'Council',
  description:
    'The Council advises the ruler and provides administrative support. Each council member contributes extra action points during development, enabling more strategic flexibility.',
};
export type CouncilInfo = typeof council;
