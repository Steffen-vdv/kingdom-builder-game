import { Registry } from '../registry';
import { Resource } from '../state';
import { buildingSchema } from '../config/schema';
import { building } from '../config/builders';
import type { BuildingDef } from './defs';

export type { BuildingDef } from './defs';

export function createBuildingRegistry() {
  const registry = new Registry<BuildingDef>(buildingSchema);

  registry.add(
    'town_charter',
    building('town_charter', 'Town Charter')
      .cost(Resource.gold, 5)
      .onBuild({
        type: 'cost_mod',
        method: 'add',
        params: {
          id: 'tc_expand_cost',
          actionId: 'expand',
          key: Resource.gold,
          amount: 2,
        },
      })
      .onBuild({
        type: 'result_mod',
        method: 'add',
        params: { id: 'tc_expand_result', actionId: 'expand' },
        effects: [
          {
            type: 'resource',
            method: 'add',
            params: { key: Resource.happiness, amount: 1 },
          },
        ],
      })
      .build(),
  );

  // TODO: remaining buildings from original manual config
  registry.add(
    'mill',
    building('mill', 'Mill')
      .cost(Resource.gold, 7)
      .onBuild({
        type: 'result_mod',
        method: 'add',
        params: {
          id: 'mill_farm_bonus',
          evaluation: { type: 'development', id: 'farm' },
          amount: 1,
        },
      })
      .build(),
  );
  registry.add(
    'raiders_guild',
    building('raiders_guild', "Raider's Guild").cost(Resource.gold, 8).build(),
  );
  registry.add(
    'plow_workshop',
    building('plow_workshop', 'Plow Workshop')
      .cost(Resource.gold, 10)
      .onBuild({ type: 'action', method: 'add', params: { id: 'plow' } })
      .build(),
  );
  registry.add(
    'market',
    building('market', 'Market').cost(Resource.gold, 10).build(),
  );
  registry.add(
    'barracks',
    building('barracks', 'Barracks').cost(Resource.gold, 12).build(),
  );
  registry.add(
    'citadel',
    building('citadel', 'Citadel').cost(Resource.gold, 12).build(),
  );
  registry.add(
    'castle_walls',
    building('castle_walls', 'Castle Walls').cost(Resource.gold, 14).build(),
  );
  registry.add(
    'castle_gardens',
    building('castle_gardens', 'Castle Gardens')
      .cost(Resource.gold, 15)
      .build(),
  );
  registry.add(
    'temple',
    building('temple', 'Temple').cost(Resource.gold, 16).build(),
  );
  registry.add(
    'palace',
    building('palace', 'Palace').cost(Resource.gold, 20).build(),
  );
  registry.add(
    'great_hall',
    building('great_hall', 'Great Hall').cost(Resource.gold, 22).build(),
  );

  return registry;
}

export const BUILDINGS = createBuildingRegistry();

export const BUILDING_INFO: Record<string, { icon: string; label: string }> = {
  town_charter: { icon: '🏘️', label: BUILDINGS.get('town_charter').name },
  mill: { icon: '⚙️', label: BUILDINGS.get('mill').name },
  raiders_guild: { icon: '🏴‍☠️', label: BUILDINGS.get('raiders_guild').name },
  plow_workshop: { icon: '🏭', label: BUILDINGS.get('plow_workshop').name },
  market: { icon: '🏪', label: BUILDINGS.get('market').name },
  barracks: { icon: '🪖', label: BUILDINGS.get('barracks').name },
  citadel: { icon: '🏯', label: BUILDINGS.get('citadel').name },
  castle_walls: { icon: '🧱', label: BUILDINGS.get('castle_walls').name },
  castle_gardens: { icon: '🌷', label: BUILDINGS.get('castle_gardens').name },
  temple: { icon: '⛪', label: BUILDINGS.get('temple').name },
  palace: { icon: '👑', label: BUILDINGS.get('palace').name },
  great_hall: { icon: '🏟️', label: BUILDINGS.get('great_hall').name },
};
