import type { PopulationRoleId } from '../state';

type ActionParameterMap = {
	develop: { id: string; landId: string };
	build: { id: string };
	demolish: { id: string };
	raise_pop: { role: PopulationRoleId };
	royal_decree: { developmentId: string; landId: string };
	[key: string]: Record<string, unknown>;
};

export type ActionParameters<T extends string> =
	T extends keyof ActionParameterMap
		? ActionParameterMap[T]
		: Record<string, unknown>;
