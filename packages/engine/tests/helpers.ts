import { createEngine } from '../src/index.ts';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
} from '@kingdom-builder/contents';
import type {
  ActionConfig as ActionDef,
  BuildingConfig as BuildingDef,
  DevelopmentConfig as DevelopmentDef,
  PopulationConfig as PopulationDef,
  StartConfig,
} from '../src/config/schema.ts';
import type { Registry } from '../src/registry.ts';
import type { PhaseDef } from '../src/phases.ts';

const BASE: {
  actions: Registry<ActionDef>;
  buildings: Registry<BuildingDef>;
  developments: Registry<DevelopmentDef>;
  populations: Registry<PopulationDef>;
  phases: PhaseDef[];
  start: StartConfig;
} = {
  actions: ACTIONS,
  buildings: BUILDINGS,
  developments: DEVELOPMENTS,
  populations: POPULATIONS,
  phases: PHASES,
  start: GAME_START,
};

export function createTestEngine(overrides: Partial<typeof BASE> = {}) {
  return createEngine({ ...BASE, ...overrides, rules: RULES });
}
