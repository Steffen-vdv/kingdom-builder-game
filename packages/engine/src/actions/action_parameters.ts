import type { ActionEffectGroupChoiceMap } from '@kingdom-builder/protocol';
import type { PopulationRoleId } from '../state';

type ActionParameterMap = {
	install_development: { id: string; landId: string };
	construct_building: { id: string };
	demolish: { id: string };
	recruit_population: { role: PopulationRoleId };
	[key: string]: Record<string, unknown>;
};

type BaseActionParameters<T extends string> = T extends keyof ActionParameterMap
	? ActionParameterMap[T]
	: Record<string, unknown>;

export type ActionParameters<T extends string> = BaseActionParameters<T> & {
	choices?: ActionEffectGroupChoiceMap;
};
