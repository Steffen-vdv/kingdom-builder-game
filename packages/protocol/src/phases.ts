import type { EffectDef } from './effects';

export type StepDef = {
	id: string;
	title?: string;
	effects?: EffectDef[];
	triggers?: string[];
};

export type PhaseDef = {
	id: string;
	steps: StepDef[];
	action?: boolean;
	icon?: string;
	label?: string;
};
