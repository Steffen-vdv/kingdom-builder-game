import type {
	WinConditionDefinition,
	WinConditionDisplay,
	WinConditionResult,
	WinConditionTrigger,
	WinConditionOutcome,
} from '@kingdom-builder/protocol';
import type { ResourceKey } from '../resources';
import type { StatKey } from '../stats';
import type { PopulationRoleId } from '../populationRoles';
import { CompareRequirementBuilder } from './builders/evaluators';
import {
	ActionBuilder,
	BaseBuilder,
	BuildingBuilder,
	DevelopmentBuilder,
	InfoBuilder,
	PopulationBuilder,
	PopulationRoleBuilder,
	ResourceBuilder,
	StatBuilder,
} from './builders/domain';
export { happinessTier, tierDisplay, tierPassiveText } from './builders/tiers';

export type {
	InfoDef,
	PopulationRoleInfo,
	ResourceInfo,
	StatInfo,
} from './builders/domain';

export {
	ActionBuilder,
	BaseBuilder,
	BuildingBuilder,
	DevelopmentBuilder,
	InfoBuilder,
	PopulationBuilder,
	PopulationRoleBuilder,
	ResourceBuilder,
	StatBuilder,
};

export {
	CompareRequirementBuilder,
	EffectBuilder,
	EvaluatorBuilder,
	RequirementBuilder,
	compareEvaluator,
	developmentEvaluator,
	effect,
	populationEvaluator,
	requirement,
	statAddEffect,
	statEvaluator,
} from './builders/evaluators';

export {
	ActionEffectGroupBuilder,
	ActionEffectGroupOptionBuilder,
	ActionEffectGroupOptionParamsBuilder,
	actionEffectGroup,
	actionEffectGroupOption,
	actionEffectGroupOptionParams,
} from './builders/actionEffectGroups';

export {
	actionParams,
	buildingParams,
	developmentParams,
	landParams,
	passiveParams,
	resourceParams,
	statParams,
} from './builders/effectParams';

export {
	AttackParamsBuilder,
	CostModParamsBuilder,
	EvaluationTargetBuilder,
	EvaluationTargetTypes,
	PopulationEffectParamsBuilder,
	ResultModParamsBuilder,
	TransferParamsBuilder,
	attackParams,
	costModParams,
	developmentTarget,
	evaluationTarget,
	populationParams,
	populationTarget,
	resultModParams,
	transferParams,
} from './builders/advancedEffectParams';

export type {
	AttackStatAnnotation,
	AttackStatRole,
} from './builders/advancedEffectParams';

export type {
	ActionEffectGroupDef,
	ActionEffectGroupOptionDef,
	DevelopmentIdParam,
} from './builders/actionEffectGroups';

export type { PhaseDef, StepDef } from './builders/startConfig';
export {
	phase,
	playerStart,
	startConfig,
	step,
	toRecord,
} from './builders/startConfig';

export function populationAssignmentPassiveId(role: PopulationRoleId) {
	return `${role}_$player_$index`;
}

export function compareRequirement() {
	return new CompareRequirementBuilder();
}

export function requirementEvaluatorCompare() {
	return compareRequirement();
}

export type WinConditionDef = WinConditionDefinition;

class WinConditionDisplayBuilder {
	private readonly config: Partial<WinConditionDisplay> = {};
	private readonly assigned = new Set<keyof WinConditionDisplay>();

	private set<K extends keyof WinConditionDisplay>(
		key: K,
		value: WinConditionDisplay[K],
		message: string,
	) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	icon(icon: string) {
		return this.set(
			'icon',
			icon,
			'Win condition display already set icon(). Remove the extra icon() call.',
		);
	}

	victory(text: string) {
		return this.set(
			'victory',
			text,
			'Win condition display already set victory(). Remove the extra victory() call.',
		);
	}

	defeat(text: string) {
		return this.set(
			'defeat',
			text,
			'Win condition display already set defeat(). Remove the extra defeat() call.',
		);
	}

	build(): WinConditionDisplay {
		return this.config as WinConditionDisplay;
	}
}

class WinConditionBuilder {
	private readonly config: Partial<WinConditionDefinition>;
	private triggerAssigned = false;
	private resultConfig: WinConditionResult = {
		subject: 'defeat',
		opponent: 'victory',
	};
	private displayConfig: WinConditionDisplay | undefined;

	constructor(id: string) {
		this.config = { id };
	}

	private setTrigger(trigger: WinConditionTrigger) {
		if (this.triggerAssigned) {
			throw new Error(
				'Win condition already defined a trigger. Remove the duplicate trigger call.',
			);
		}
		this.config.trigger = trigger;
		this.triggerAssigned = true;
		return this;
	}

	resourceThreshold(
		resource: ResourceKey,
		comparison: WinConditionTrigger['comparison'],
		value: number,
		target: WinConditionTrigger['target'] = 'self',
	) {
		return this.setTrigger({
			type: 'resource',
			key: resource,
			comparison,
			value,
			target,
		});
	}

	resourceAtMost(
		resource: ResourceKey,
		value: number,
		target: WinConditionTrigger['target'] = 'self',
	) {
		return this.resourceThreshold(resource, 'lte', value, target);
	}

	resourceAtLeast(
		resource: ResourceKey,
		value: number,
		target: WinConditionTrigger['target'] = 'self',
	) {
		return this.resourceThreshold(resource, 'gte', value, target);
	}

	subject(outcome: WinConditionOutcome) {
		this.resultConfig = {
			...this.resultConfig,
			subject: outcome,
		};
		return this;
	}

	opponent(outcome: WinConditionOutcome) {
		this.resultConfig = {
			...this.resultConfig,
			opponent: outcome,
		};
		return this;
	}

	subjectVictory() {
		return this.subject('victory');
	}

	subjectDefeat() {
		return this.subject('defeat');
	}

	subjectNone() {
		return this.subject('none');
	}

	opponentVictory() {
		return this.opponent('victory');
	}

	opponentDefeat() {
		return this.opponent('defeat');
	}

	opponentNone() {
		return this.opponent('none');
	}

	display(
		configure:
			| WinConditionDisplayBuilder
			| ((builder: WinConditionDisplayBuilder) => WinConditionDisplayBuilder),
	) {
		if (this.displayConfig) {
			throw new Error(
				'Win condition already set display(). Remove the extra display() call.',
			);
		}
		const builder =
			configure instanceof WinConditionDisplayBuilder
				? configure
				: configure(new WinConditionDisplayBuilder());
		if (!(builder instanceof WinConditionDisplayBuilder)) {
			throw new Error(
				'Win condition display(...) callback must return the provided builder.',
			);
		}
		this.displayConfig = builder.build();
		return this;
	}

	build(): WinConditionDefinition {
		const { id } = this.config;
		if (!id) {
			throw new Error('Win condition is missing an id.');
		}
		if (!this.triggerAssigned || !this.config.trigger) {
			throw new Error(
				'Win condition is missing a trigger. Define a trigger before build().',
			);
		}
		const built: WinConditionDefinition = {
			id,
			trigger: this.config.trigger,
			result: { ...this.resultConfig },
		};
		if (this.displayConfig) {
			built.display = { ...this.displayConfig };
		}
		return built;
	}
}

export function winCondition(id: string) {
	return new WinConditionBuilder(id);
}

export function action() {
	return new ActionBuilder();
}
export function building() {
	return new BuildingBuilder();
}
export function development() {
	return new DevelopmentBuilder();
}
export function population() {
	return new PopulationBuilder();
}
export function resource(key: ResourceKey) {
	return new ResourceBuilder(key);
}
export function stat(key: StatKey) {
	return new StatBuilder(key);
}
export function populationRole(key: PopulationRoleId) {
	return new PopulationRoleBuilder(key);
}
