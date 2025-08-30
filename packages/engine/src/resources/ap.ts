import { Resource } from '../state';

export const ap = {
  key: Resource.ap,
  icon: '⚡',
  label: 'Action Points',
  description:
    'Action Points represent the amount of activity your court can undertake in a turn. Each main phase you spend AP to perform actions; fresh AP is generated at the start of the next round, so unused points are lost.',
};
export type ApInfo = typeof ap;
