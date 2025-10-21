import { describe, it, expectTypeOf } from 'vitest';
import type { ActionEffectGroupChoiceMap } from '@kingdom-builder/protocol';
import type { ActionParameters } from '../../src/actions/action_parameters';

type DevelopmentActionId = 'develop_alpha' | 'develop_beta';
type BuildingActionId = 'build_alpha' | 'build_beta';
type PopulationActionId = 'hire_alpha' | 'hire_beta';

describe('ActionParameters type definitions', () => {
	it('require land for development actions', () => {
		expectTypeOf<ActionParameters<DevelopmentActionId>>().toMatchTypeOf<{
			landId: string;
			choices?: ActionEffectGroupChoiceMap;
		}>();
		expectTypeOf<{
			landId: string;
			choices?: ActionEffectGroupChoiceMap;
		}>().toMatchTypeOf<ActionParameters<DevelopmentActionId>>();
	});

	it('allow empty payloads for building actions', () => {
		expectTypeOf<ActionParameters<BuildingActionId>>().toMatchTypeOf<{
			choices?: ActionEffectGroupChoiceMap;
		}>();
	});

	it('allow empty payloads for population actions', () => {
		expectTypeOf<ActionParameters<PopulationActionId>>().toMatchTypeOf<{
			choices?: ActionEffectGroupChoiceMap;
		}>();
	});

	it('retain demolition payload requirements', () => {
		expectTypeOf<ActionParameters<'demolish'>>().toMatchTypeOf<{
			id: string;
			choices?: ActionEffectGroupChoiceMap;
		}>();
	});
});
