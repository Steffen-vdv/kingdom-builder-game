import { Registry } from '@kingdom-builder/engine/registry';
import { Resource, Stat } from '@kingdom-builder/engine/state';
import { buildingSchema } from '@kingdom-builder/engine/config/schema';
import {
  building,
  effect,
  Types,
  CostModMethods,
  ResultModMethods,
  ResourceMethods,
  ActionMethods,
  PassiveMethods,
  StatMethods,
} from './config/builders';
import type { BuildingDef } from './defs';

export type { BuildingDef } from './defs';

export function createBuildingRegistry() {
  const registry = new Registry<BuildingDef>(buildingSchema);

  registry.add(
    'town_charter',
    building()
      .id('town_charter')
      .name('Town Charter')
      .icon('🏘️')
      .cost(Resource.gold, 5)
      .onBuild(
        effect(Types.CostMod, CostModMethods.ADD)
          .params({
            id: 'tc_expand_cost',
            actionId: 'expand',
            key: Resource.gold,
            amount: 2,
          })
          .build(),
      )
      .onBuild(
        effect(Types.ResultMod, ResultModMethods.ADD)
          .params({ id: 'tc_expand_result', actionId: 'expand' })
          .effect(
            effect(Types.Resource, ResourceMethods.ADD)
              .params({ key: Resource.happiness, amount: 1 })
              .build(),
          )
          .build(),
      )
      .build(),
  );

  // TODO: remaining buildings from original manual config
  registry.add(
    'mill',
    building()
      .id('mill')
      .name('Mill')
      .icon('⚙️')
      .cost(Resource.gold, 7)
      .onBuild(
        effect(Types.ResultMod, ResultModMethods.ADD)
          .params({
            id: 'mill_farm_bonus',
            evaluation: { type: 'development', id: 'farm' },
            amount: 1,
          })
          .build(),
      )
      .build(),
  );
  registry.add(
    'raiders_guild',
    building()
      .id('raiders_guild')
      .name("Raider's Guild")
      .icon('🏴‍☠️')
      .cost(Resource.gold, 8)
      .cost(Resource.ap, 1)
      .onBuild(
        effect(Types.ResultMod, ResultModMethods.ADD)
          .params({
            id: 'raiders_guild_plunder_bonus',
            evaluation: { type: 'transfer_pct', id: 'percent' },
            adjust: 25,
          })
          .build(),
      )
      .build(),
  );
  registry.add(
    'plow_workshop',
    building()
      .id('plow_workshop')
      .name('Plow Workshop')
      .icon('🏭')
      .cost(Resource.gold, 10)
      .onBuild(
        effect(Types.Action, ActionMethods.ADD).param('id', 'plow').build(),
      )
      .build(),
  );
  registry.add(
    'market',
    building()
      .id('market')
      .name('Market')
      .icon('🏪')
      .cost(Resource.gold, 10)
      .onBuild(
        effect(Types.ResultMod, ResultModMethods.ADD)
          .params({
            id: 'market_tax_bonus',
            evaluation: { type: 'population', id: 'tax' },
            amount: 1,
          })
          .build(),
      )
      .build(),
  );
  registry.add(
    'barracks',
    building()
      .id('barracks')
      .name('Barracks')
      .icon('🪖')
      .cost(Resource.gold, 12)
      .build(),
  );
  registry.add(
    'citadel',
    building()
      .id('citadel')
      .name('Citadel')
      .icon('🏯')
      .cost(Resource.gold, 12)
      .build(),
  );
  registry.add(
    'castle_walls',
    building()
      .id('castle_walls')
      .name('Castle Walls')
      .icon('🧱')
      .cost(Resource.gold, 12)
      .onBuild(
        effect(Types.Passive, PassiveMethods.ADD)
          .param('id', 'castle_walls_bonus')
          .effect(
            effect(Types.Stat, StatMethods.ADD)
              .params({ key: Stat.fortificationStrength, amount: 5 })
              .build(),
          )
          .effect(
            effect(Types.Stat, StatMethods.ADD)
              .params({ key: Stat.absorption, amount: 0.2 })
              .build(),
          )
          .build(),
      )
      .build(),
  );
  registry.add(
    'castle_gardens',
    building()
      .id('castle_gardens')
      .name('Castle Gardens')
      .icon('🌷')
      .cost(Resource.gold, 15)
      .build(),
  );
  registry.add(
    'temple',
    building()
      .id('temple')
      .name('Temple')
      .icon('⛪')
      .cost(Resource.gold, 16)
      .build(),
  );
  registry.add(
    'palace',
    building()
      .id('palace')
      .name('Palace')
      .icon('👑')
      .cost(Resource.gold, 20)
      .build(),
  );
  registry.add(
    'great_hall',
    building()
      .id('great_hall')
      .name('Great Hall')
      .icon('🏟️')
      .cost(Resource.gold, 22)
      .build(),
  );

  return registry;
}

export const BUILDINGS = createBuildingRegistry();
