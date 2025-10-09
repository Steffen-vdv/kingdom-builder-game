import type { ActionEffectGroupChoiceMap } from '@kingdom-builder/protocol';
import type { PopulationRoleId } from '../state';

type ActionParameterMap = {
	develop: { id: string; landId: string };
	build: { id: string };
	demolish: { id: string };
	raise_pop: { role: PopulationRoleId };
	[key: string]: Record<string, unknown>;
};

type BaseActionParameters<T extends string> = T extends keyof ActionParameterMap
	? ActionParameterMap[T]
	: Record<string, unknown>;

export type ActionParameters<T extends string> = BaseActionParameters<T> & {
	choices?: ActionEffectGroupChoiceMap;
};
