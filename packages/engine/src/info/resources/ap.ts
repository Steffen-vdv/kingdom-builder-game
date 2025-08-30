import { Resource } from '../../state';

export const ap = {
  key: Resource.ap,
  icon: '⚡',
  label: 'Action Points',
  description:
    'Action Points measure how many moves you can make in the main phase. Each Council member generates one point during development, and most actions spend one.',
} as const;
