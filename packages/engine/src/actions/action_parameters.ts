import type { ActionEffectGroupChoiceMap } from '@kingdom-builder/protocol';

type DemolishActionParameters = { id: string };
type DevelopmentActionParameters = { landId: string };
type EmptyActionParameters = Record<never, never>;

type DevelopmentActionId = `develop_${string}`;
type BuildingActionId = `build_${string}`;
type PopulationActionId = `hire_${string}`;

type DevelopmentActionParameterMap = {
	[Key in DevelopmentActionId]: DevelopmentActionParameters;
};

type BuildingActionParameterMap = {
	[Key in BuildingActionId]: EmptyActionParameters;
};

type PopulationActionParameterMap = {
	[Key in PopulationActionId]: EmptyActionParameters;
};

type ActionParameterMap = {
	demolish: DemolishActionParameters;
	[key: string]: Record<string, unknown>;
} & DevelopmentActionParameterMap &
	BuildingActionParameterMap &
	PopulationActionParameterMap;

type BaseActionParameters<T extends string> = T extends keyof ActionParameterMap
	? ActionParameterMap[T]
	: Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type ActionParameters<T extends string> = BaseActionParameters<T> & {
	choices?: ActionEffectGroupChoiceMap;
};
