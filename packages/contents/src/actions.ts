import { Registry } from '@kingdom-builder/engine/registry';
import { Resource } from '@kingdom-builder/engine/state';
import {
  actionSchema,
  type ActionConfig,
} from '@kingdom-builder/engine/config/schema';
import { action } from '@kingdom-builder/engine/config/builders';

export type ActionDef = ActionConfig;

export function createActionRegistry() {
  const registry = new Registry<ActionDef>(actionSchema);

  registry.add(
    'expand',
    action('expand', 'Expand')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 2)
      .effect({ type: 'land', method: 'add', params: { count: 1 } })
      .effect({
        type: 'resource',
        method: 'add',
        params: { key: Resource.happiness, amount: 1 },
      })
      .build(),
  );

  registry.add(
    'overwork',
    action('overwork', 'Overwork')
      .cost(Resource.ap, 1)
      .effect({
        evaluator: { type: 'development', params: { id: 'farm' } },
        effects: [
          {
            type: 'resource',
            method: 'add',
            round: 'down',
            params: { key: Resource.gold, amount: 2 },
          },
          {
            type: 'resource',
            method: 'add',
            round: 'up',
            params: { key: Resource.happiness, amount: -0.5 },
          },
        ],
      })
      .build(),
  );

  registry.add(
    'develop',
    action('develop', 'Develop')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 3)
      .effect({
        type: 'development',
        method: 'add',
        params: { id: '$id', landId: '$landId' },
      })
      .build(),
  );

  registry.add(
    'tax',
    action('tax', 'Tax')
      .cost(Resource.ap, 1)
      .effect({
        evaluator: { type: 'population' },
        effects: [
          {
            type: 'resource',
            method: 'add',
            params: { key: Resource.gold, amount: 4 },
          },
          {
            type: 'resource',
            method: 'add',
            round: 'up',
            params: { key: Resource.happiness, amount: -0.5 },
          },
        ],
      })
      .build(),
  );

  registry.add(
    'reallocate',
    action('reallocate', 'Reallocate')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 5)
      .build(),
  );

  registry.add(
    'raise_pop',
    action('raise_pop', 'Raise Population')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 5)
      .requirement({
        type: 'population',
        method: 'cap',
        message: 'Free space for 👥',
      })
      .effect({
        type: 'population',
        method: 'add',
        params: { role: '$role' },
      })
      .effect({
        type: 'resource',
        method: 'add',
        params: { key: Resource.happiness, amount: 1 },
      })
      .build(),
  );

  registry.add(
    'royal_decree',
    action('royal_decree', 'Royal Decree')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 12)
      .build(),
  );

  registry.add(
    'army_attack',
    action('army_attack', 'Army Attack').cost(Resource.ap, 1).build(),
  );

  registry.add(
    'hold_festival',
    action('hold_festival', 'Hold Festival')
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 3)
      .build(),
  );

  registry.add(
    'build_plow_workshop',
    action('build_plow_workshop', 'Build - Plow Workshop')
      .cost(Resource.ap, 1)
      .effect({
        type: 'building',
        method: 'add',
        params: { id: 'plow_workshop' },
      })
      .build(),
  );

  registry.add(
    'plow',
    action('plow', 'Plow')
      .system()
      .cost(Resource.ap, 1)
      .cost(Resource.gold, 6)
      .build(),
  );

  registry.add(
    'till',
    action('till', 'Till')
      .system()
      .effect({ type: 'land', method: 'till' })
      .build(),
  );

  registry.add(
    'build',
    action('build', 'Build')
      .cost(Resource.ap, 1)
      .effect({ type: 'building', method: 'add', params: { id: '$id' } })
      .build(),
  );

  return registry;
}

export const ACTIONS = createActionRegistry();

export const ACTION_INFO: Record<string, { icon: string; label: string }> = {
  expand: { icon: '🌱', label: ACTIONS.get('expand').name },
  overwork: { icon: '🛠️', label: ACTIONS.get('overwork').name },
  develop: { icon: '🏗️', label: ACTIONS.get('develop').name },
  tax: { icon: '💰', label: ACTIONS.get('tax').name },
  reallocate: { icon: '🔄', label: ACTIONS.get('reallocate').name },
  raise_pop: { icon: '👶', label: ACTIONS.get('raise_pop').name },
  royal_decree: { icon: '📜', label: ACTIONS.get('royal_decree').name },
  army_attack: { icon: '🗡️', label: ACTIONS.get('army_attack').name },
  hold_festival: { icon: '🎉', label: ACTIONS.get('hold_festival').name },
  build_plow_workshop: {
    icon: '🚜',
    label: ACTIONS.get('build_plow_workshop').name,
  },
  plow: { icon: '🚜', label: ACTIONS.get('plow').name },
  build: { icon: '🏛️', label: ACTIONS.get('build').name },
} as const;
