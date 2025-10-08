import type {
	EffectConfig,
	EffectDef,
	WinConditionDefinition,
	WinConditionDisplay,
	WinConditionResult,
	WinConditionTrigger,
	WinConditionOutcome,
	PlayerStartConfig,
	StartConfig,
	StartModeConfig,
} from '@kingdom-builder/protocol';
import type { ResourceKey } from '../resources';
import type { StatKey } from '../stats';
import type { TriggerKey } from '../defs';
import type { PopulationRoleId } from '../populationRoles';
import type {
	PhaseId as PhaseIdentifier,
	PhaseStepId as PhaseStepIdentifier,
} from '../phases';
import { ParamsBuilder } from './builderShared';
import { resolveEffectConfig } from './builders/effectParams';
import type { EffectBuilder } from './builders/evaluators';
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
} from './builders/domainBuilders';
export {
	happinessTier,
	tierDisplay,
	tierPassiveText,
} from './builders/tierBuilders';

export type {
	InfoDef,
	PopulationRoleInfo,
	ResourceInfo,
	StatInfo,
} from './builders/domainBuilders';

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

export function populationAssignmentPassiveId(role: PopulationRoleId) {
	return `${role}_$player_$index`;
}

export function compareRequirement() {
	return new CompareRequirementBuilder();
}

export function requirementEvaluatorCompare() {
	return compareRequirement();
}

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

interface PlayerStartBuilderOptions {
	requireComplete?: boolean;
}

type LandStartConfig = NonNullable<PlayerStartConfig['lands']>[number];

function cloneLandStartConfig(land: LandStartConfig): LandStartConfig {
	return {
		...land,
		developments: land.developments ? [...land.developments] : undefined,
		onPayUpkeepStep: land.onPayUpkeepStep
			? [...land.onPayUpkeepStep]
			: undefined,
		onGainIncomeStep: land.onGainIncomeStep
			? [...land.onGainIncomeStep]
			: undefined,
		onGainAPStep: land.onGainAPStep ? [...land.onGainAPStep] : undefined,
	};
}

class PlayerStartLandBuilder extends ParamsBuilder<LandStartConfig> {
	development(id: string) {
		this.params.developments = this.params.developments || [];
		this.params.developments.push(id);
		return this;
	}

	developments(...ids: string[]) {
		ids.forEach((id) => this.development(id));
		return this;
	}

	slotsMax(slots: number) {
		return this.set(
			'slotsMax',
			slots,
			'Player start land already set slotsMax(). Remove the extra slotsMax() call.',
		);
	}

	slotsUsed(slots: number) {
		return this.set(
			'slotsUsed',
			slots,
			'Player start land already set slotsUsed(). Remove the extra slotsUsed() call.',
		);
	}

	tilled(tilled = true) {
		return this.set(
			'tilled',
			tilled,
			'Player start land already set tilled(). Remove the extra tilled() call.',
		);
	}

	upkeep(costs: Record<string, number>) {
		return this.set(
			'upkeep',
			{ ...costs },
			'Player start land already set upkeep(). Remove the extra upkeep() call.',
		);
	}

	onPayUpkeepStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onPayUpkeepStep = this.params.onPayUpkeepStep || [];
		this.params.onPayUpkeepStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	onGainIncomeStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onGainIncomeStep = this.params.onGainIncomeStep || [];
		this.params.onGainIncomeStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	onGainAPStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onGainAPStep = this.params.onGainAPStep || [];
		this.params.onGainAPStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	override build() {
		return cloneLandStartConfig(super.build());
	}
}

class PlayerStartLandsBuilder {
	private readonly lands: LandStartConfig[] = [];

	private resolveBuilder(
		input:
			| PlayerStartLandBuilder
			| ((builder: PlayerStartLandBuilder) => PlayerStartLandBuilder),
	) {
		if (input instanceof PlayerStartLandBuilder) {
			return input;
		}
		const configured = input(new PlayerStartLandBuilder());
		if (!(configured instanceof PlayerStartLandBuilder)) {
			throw new Error(
				'Player start lands land(...) callback must return the provided builder.',
			);
		}
		return configured;
	}

	land(
		input?:
			| LandStartConfig
			| PlayerStartLandBuilder
			| ((builder: PlayerStartLandBuilder) => PlayerStartLandBuilder),
	) {
		if (!input) {
			this.lands.push({});
			return this;
		}
		if (input instanceof PlayerStartLandBuilder) {
			this.lands.push(input.build());
			return this;
		}
		if (typeof input === 'function') {
			const builder = this.resolveBuilder(input);
			this.lands.push(builder.build());
			return this;
		}
		this.lands.push(cloneLandStartConfig(input));
		return this;
	}

	build() {
		return this.lands.map((land) => cloneLandStartConfig(land));
	}
}

class PlayerStartBuilder extends ParamsBuilder<PlayerStartConfig> {
	constructor(private readonly requireComplete: boolean) {
		super();
	}

	resources(values: Record<string, number>) {
		if (!values) {
			throw new Error(
				'Player start resources() needs a record. Use {} when nothing changes.',
			);
		}
		return this.set(
			'resources',
			{ ...values },
			'Player start already set resources(). Remove the extra resources() call.',
		);
	}

	stats(values: Record<string, number>) {
		if (!values) {
			throw new Error(
				'Player start stats() needs a record. Use {} when no stats change.',
			);
		}
		return this.set(
			'stats',
			{ ...values },
			'Player start already set stats(). Remove the extra stats() call.',
		);
	}

	population(values: Record<string, number>) {
		if (!values) {
			throw new Error(
				'Player start population() needs a record. Use {} when empty.',
			);
		}
		return this.set(
			'population',
			{ ...values },
			'Player start already set population(). Remove the extra population() call.',
		);
	}

	lands(
		input:
			| NonNullable<PlayerStartConfig['lands']>
			| PlayerStartLandsBuilder
			| ((builder: PlayerStartLandsBuilder) => PlayerStartLandsBuilder),
	) {
		if (!input) {
			throw new Error(
				'Player start lands() needs configuration. Use [] when no lands are configured.',
			);
		}
		if (input instanceof PlayerStartLandsBuilder) {
			return this.set(
				'lands',
				input.build(),
				'Player start already set lands(). Remove the extra lands() call.',
			);
		}
		if (Array.isArray(input)) {
			return this.set(
				'lands',
				input.map((land) => cloneLandStartConfig(land)),
				'Player start already set lands(). Remove the extra lands() call.',
			);
		}
		const configured = input(new PlayerStartLandsBuilder());
		if (!(configured instanceof PlayerStartLandsBuilder)) {
			throw new Error(
				'Player start lands(...) callback must return the provided builder.',
			);
		}
		return this.set(
			'lands',
			configured.build(),
			'Player start already set lands(). Remove the extra lands() call.',
		);
	}

	override build(): PlayerStartConfig {
		if (this.requireComplete) {
			if (!this.wasSet('resources')) {
				throw new Error(
					'Player start is missing resources(). Call resources(...) before build().',
				);
			}
			if (!this.wasSet('stats')) {
				throw new Error(
					'Player start is missing stats(). Call stats(...) before build().',
				);
			}
			if (!this.wasSet('population')) {
				throw new Error(
					'Player start is missing population(). Call population(...) before build().',
				);
			}
			if (!this.wasSet('lands')) {
				throw new Error(
					'Player start is missing lands(). Call lands(...) before build().',
				);
			}
		}
		return super.build();
	}
}

class StartModeBuilder {
	private playerConfig: PlayerStartConfig | undefined;
	private readonly playerOverrides: Record<string, PlayerStartConfig> = {};
	private readonly assignedOverrides = new Set<string>();

	private resolve(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (input instanceof PlayerStartBuilder) {
			return input;
		}
		const configured = input(new PlayerStartBuilder(false));
		if (!(configured instanceof PlayerStartBuilder)) {
			throw new Error(
				'Start mode player(...) callback must return the provided builder.',
			);
		}
		return configured;
	}

	player(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (this.playerConfig) {
			throw new Error(
				'Dev mode start already set player(...). Remove the extra player() call.',
			);
		}
		const builder = this.resolve(input);
		this.playerConfig = builder.build();
		return this;
	}

	playerOverride(
		id: string,
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (!id) {
			throw new Error(
				'Dev mode playerOverride() requires a non-empty player id.',
			);
		}
		if (this.assignedOverrides.has(id)) {
			throw new Error(
				`Dev mode already set override "${id}". Remove the extra playerOverride() call.`,
			);
		}
		const builder = this.resolve(input);
		this.playerOverrides[id] = builder.build();
		this.assignedOverrides.add(id);
		return this;
	}

	build(): StartModeConfig {
		const config: StartModeConfig = {};
		if (this.playerConfig) {
			config.player = structuredClone(this.playerConfig);
		}
		if (this.assignedOverrides.size > 0) {
			const overrides: Record<string, PlayerStartConfig> = {};
			for (const [playerId, overrideConfig] of Object.entries(
				this.playerOverrides,
			)) {
				overrides[playerId] = structuredClone(overrideConfig);
			}
			config.players = overrides;
		}
		return config;
	}
}

class StartConfigBuilder {
	private playerConfig: PlayerStartConfig | undefined;
	private lastPlayerCompensationConfig: PlayerStartConfig | undefined;
	private devModeConfig: StartModeConfig | undefined;

	private resolveBuilder(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
		requireComplete: boolean,
	) {
		if (input instanceof PlayerStartBuilder) {
			return input;
		}
		const configured = input(new PlayerStartBuilder(requireComplete));
		if (!(configured instanceof PlayerStartBuilder)) {
			throw new Error(
				'Start config player(...) callback must return the provided builder.',
			);
		}
		return configured;
	}

	player(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (this.playerConfig) {
			throw new Error(
				'Start config already set player(...). Remove the extra player() call.',
			);
		}
		const builder = this.resolveBuilder(input, true);
		this.playerConfig = builder.build();
		return this;
	}

	lastPlayerCompensation(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (this.lastPlayerCompensationConfig) {
			throw new Error(
				'Start config already set lastPlayerCompensation(). Remove the extra call.',
			);
		}
		const builder = this.resolveBuilder(input, false);
		this.lastPlayerCompensationConfig = builder.build();
		return this;
	}

	devMode(
		input: StartModeBuilder | ((builder: StartModeBuilder) => StartModeBuilder),
	) {
		if (this.devModeConfig) {
			throw new Error(
				'Start config already set devMode(...). Remove the extra call.',
			);
		}
		if (input instanceof StartModeBuilder) {
			this.devModeConfig = input.build();
			return this;
		}
		const configured = input(new StartModeBuilder());
		if (!(configured instanceof StartModeBuilder)) {
			throw new Error(
				'Start config devMode(...) callback must return the provided builder.',
			);
		}
		this.devModeConfig = configured.build();
		return this;
	}

	build(): StartConfig {
		if (!this.playerConfig) {
			throw new Error(
				'Start config is missing player(...). Configure the base player first.',
			);
		}
		const config: StartConfig = { player: this.playerConfig };
		if (this.lastPlayerCompensationConfig) {
			config.players = { B: this.lastPlayerCompensationConfig };
		}
		if (this.devModeConfig) {
			config.modes = { dev: structuredClone(this.devModeConfig) };
		}
		return config;
	}
}

export function playerStart(options?: PlayerStartBuilderOptions) {
	return new PlayerStartBuilder(options?.requireComplete ?? true);
}

export function startConfig() {
	return new StartConfigBuilder();
}

export function toRecord<T extends { key: string }>(items: T[]) {
	return Object.fromEntries(items.map((i) => [i.key, i])) as Record<string, T>;
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
export function phase(id: PhaseIdentifier) {
	return new PhaseBuilder(id);
}
export function step(id: PhaseStepIdentifier) {
	return new StepBuilder(id);
}
