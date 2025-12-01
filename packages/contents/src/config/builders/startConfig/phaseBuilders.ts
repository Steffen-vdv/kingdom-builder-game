import type { EffectDef, PhaseConfig, PhaseStepConfig } from '@kingdom-builder/protocol';
import type { TriggerKey } from '../../../defs';
import type { PhaseId as PhaseIdentifier, PhaseStepId as PhaseStepIdentifier } from '../../../phaseTypes';

class StepBuilder {
	private config: PhaseStepConfig;

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

	build(): PhaseStepConfig {
		return this.config;
	}
}

class PhaseBuilder {
	private config: PhaseConfig;

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

	step(step: PhaseStepConfig | StepBuilder) {
		const built = step instanceof StepBuilder ? step.build() : step;
		this.config.steps.push(built);
		return this;
	}

	build(): PhaseConfig {
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
export type { PhaseConfig, PhaseStepConfig };
export type PhaseDef = PhaseConfig;
export type StepDef = PhaseStepConfig;
