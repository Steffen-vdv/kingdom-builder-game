import type { ActionEffectGroupChoiceMap } from '@kingdom-builder/protocol';
type ActionParameterMap = {
	develop: { id: string; landId: string };
	'develop:farm': { landId: string };
	'develop:house': { landId: string };
	'develop:outpost': { landId: string };
	'develop:watchtower': { landId: string };
	'develop:garden': { landId: string };
	demolish: { id: string };
	[key: string]: Record<string, unknown>;
};

type BaseActionParameters<T extends string> = T extends keyof ActionParameterMap
	? ActionParameterMap[T]
	: Record<string, unknown>;

export type ActionParameters<T extends string> = BaseActionParameters<T> & {
	choices?: ActionEffectGroupChoiceMap;
};
