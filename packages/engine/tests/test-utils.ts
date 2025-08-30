import {
  createActionRegistry,
  createBuildingRegistry,
  createDevelopmentRegistry,
  createPopulationRegistry,
  PHASES,
  GAME_START,
} from '@kingdom-builder/contents';
import { createEngine } from '../src';

export function createTestEngine(
  overrides: Parameters<typeof createEngine>[0] = {},
) {
  const base = {
    actions: createActionRegistry(),
    buildings: createBuildingRegistry(),
    developments: createDevelopmentRegistry(),
    populations: createPopulationRegistry(),
    phases: PHASES,
    config: { start: GAME_START },
  };
  return createEngine({
    ...base,
    ...overrides,
    config: { ...base.config, ...overrides.config },
  });
}

export { PHASES } from '@kingdom-builder/contents';
