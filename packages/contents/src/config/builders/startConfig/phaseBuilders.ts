import type { EffectDef } from '@kingdom-builder/protocol';
import type { TriggerKey } from '../../../defs';
import type {
	PhaseId as PhaseIdentifier,
	PhaseStepId as PhaseStepIdentifier,
} from '../../../phases';

export interface StepDef {
	id: PhaseStepIdentifier;
	title?: string;
	triggers?: TriggerKey[];
	effects?: EffectDef[];
	icon?: string;
}

class StepBuilder {
	private config: StepDef;

	constructor(id: PhaseStepIdentifier) {
		this.config = { id };
	}

	title(title: string) {
		this.config.title = title;
		return this;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	trigger(trigger: TriggerKey) {
		this.config.triggers = this.config.triggers || [];
		this.config.triggers.push(trigger);
		return this;
	}

	triggers(...triggers: TriggerKey[]) {
		this.config.triggers = this.config.triggers || [];
		this.config.triggers.push(...triggers);
		return this;
	}

	effect(effect: EffectDef) {
		this.config.effects = this.config.effects || [];
		this.config.effects.push(effect);
		return this;
	}

	build(): StepDef {
		return this.config;
	}
}

export interface PhaseDef {
	id: PhaseIdentifier;
	steps: StepDef[];
	action?: boolean;
	label: string;
	icon?: string;
}

class PhaseBuilder {
	private config: PhaseDef;

	constructor(id: PhaseIdentifier) {
		this.config = { id, steps: [], label: '' };
	}

	label(label: string) {
		this.config.label = label;
		return this;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	action(flag = true) {
		this.config.action = flag;
		return this;
	}

	step(step: StepDef | StepBuilder) {
		const built = step instanceof StepBuilder ? step.build() : step;
		this.config.steps.push(built);
		return this;
	}

	build(): PhaseDef {
		return this.config;
	}
}

export function phase(id: PhaseIdentifier) {
	return new PhaseBuilder(id);
}

export function step(id: PhaseStepIdentifier) {
	return new StepBuilder(id);
}

export { PhaseBuilder, StepBuilder };
