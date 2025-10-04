import type { PopulationRoleId } from '../state';

type ActionParameterMap = {
	develop: { id: string; landId: string };
	build: { id: string };
	demolish: { id: string };
	raise_pop: { role: PopulationRoleId };
	[key: string]: Record<string, unknown>;
};

type ActionParameterBase<T extends string> = T extends keyof ActionParameterMap
	? ActionParameterMap[T]
	: Record<string, unknown>;

export type ActionChoiceDetail = {
	option: string;
	params?: Record<string, unknown>;
};

export type ActionChoiceValue = string | ActionChoiceDetail | null | undefined;

export type ActionChoiceMap = Record<string, ActionChoiceValue>;

export type ActionParameters<T extends string> = ActionParameterBase<T> & {
	choices?: ActionChoiceMap;
	values?: ActionParameterBase<T>;
};
