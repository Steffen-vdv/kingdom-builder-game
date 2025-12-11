import type { AttackTarget, EffectConfig, EffectDef } from '@kingdom-builder/protocol';
import type { ActionId } from '../../actions';
import type { ResourceKey } from '../../internal';
import { ParamsBuilder } from '../builderShared';
import { resolveEffectConfig } from './effectParams';
import type { EffectBuilder } from './evaluators';

export class CostModParamsBuilder extends ParamsBuilder<{
	id?: string;
	actionId?: ActionId;
	resourceId?: ResourceKey;
	amount?: number;
	percent?: number;
}> {
	id(id: string) {
		return this.set('id', id);
	}
	actionId(actionId: ActionId) {
		return this.set('actionId', actionId);
	}
	resourceId(resourceId: ResourceKey) {
		return this.set('resourceId', resourceId);
	}
	amount(amount: number) {
		return this.set('amount', amount);
	}
	percent(percent: number) {
		return this.set('percent', percent);
	}
}
export const costModParams = () => new CostModParamsBuilder();
export enum EvaluationTargetTypes {
	Development = 'development',
	Population = 'population',
}
type LooseEvaluationTargetType = string & {
	readonly __evaluationTargetBrand?: never;
};
type EvaluationTargetType = EvaluationTargetTypes | LooseEvaluationTargetType;

export class EvaluationTargetBuilder extends ParamsBuilder<{
	type: EvaluationTargetType;
	id?: string;
}> {
	constructor(type: EvaluationTargetType) {
		super();
		this.set('type', type);
	}
	id(id: string) {
		return this.set('id', id);
	}
}
export const evaluationTarget = (type: string) => new EvaluationTargetBuilder(type);
export function developmentTarget() {
	return evaluationTarget(EvaluationTargetTypes.Development);
}
export const populationTarget = () => evaluationTarget(EvaluationTargetTypes.Population);
export class ResultModParamsBuilder extends ParamsBuilder<{
	id?: string;
	actionId?: ActionId;
	evaluation?: { type: EvaluationTargetType; id?: string };
	amount?: number;
	adjust?: number;
	percent?: number;
}> {
	id(id: string) {
		return this.set('id', id);
	}
	actionId(actionId: ActionId) {
		return this.set('actionId', actionId);
	}
	evaluation(target: EvaluationTargetBuilder | { type: EvaluationTargetType; id?: string }) {
		return this.set('evaluation', target instanceof EvaluationTargetBuilder ? target.build() : target);
	}
	amount(amount: number) {
		return this.set('amount', amount);
	}
	adjust(amount: number) {
		return this.set('adjust', amount);
	}
	percent(percent: number) {
		return this.set('percent', percent);
	}
}
export const resultModParams = () => new ResultModParamsBuilder();

export type AttackResourceRole = 'power' | 'absorption' | 'fortification';
export type AttackResourceAnnotation = {
	role: AttackResourceRole;
	key: ResourceKey;
	label?: string;
	icon?: string;
};
export class AttackParamsBuilder extends ParamsBuilder<{
	target?: AttackTarget;
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
	resources?: AttackResourceAnnotation[];
	onDamage?: {
		attacker?: EffectDef[];
		defender?: EffectDef[];
	};
}> {
	private ensureOnDamage() {
		if (!this.params.onDamage) {
			this.params.onDamage = {};
		}
		return this.params.onDamage;
	}
	targetResource(resourceId: ResourceKey) {
		return this.set('target', { type: 'resource', resourceId });
	}
	targetBuilding(id: string) {
		return this.set('target', { type: 'building', id });
	}
	ignoreAbsorption(flag = true) {
		return this.set('ignoreAbsorption', flag);
	}
	ignoreFortification(flag = true) {
		return this.set('ignoreFortification', flag);
	}
	attackResource(role: AttackResourceRole, key: ResourceKey, overrides: { label?: string; icon?: string } = {}) {
		const resources = this.params.resources || (this.params.resources = []);
		const existingIndex = resources.findIndex((item) => item.role === role);
		const annotation: AttackResourceAnnotation = {
			role,
			key,
			...overrides,
		};
		if (existingIndex >= 0) {
			resources.splice(existingIndex, 1, annotation);
		} else {
			resources.push(annotation);
		}
		return this;
	}
	powerResource(key: ResourceKey, overrides?: { label?: string; icon?: string }) {
		return this.attackResource('power', key, overrides);
	}
	absorptionResource(key: ResourceKey, overrides?: { label?: string; icon?: string }) {
		return this.attackResource('absorption', key, overrides);
	}
	fortificationResource(key: ResourceKey, overrides?: { label?: string; icon?: string }) {
		return this.attackResource('fortification', key, overrides);
	}
	onDamageAttacker(...effects: Array<EffectConfig | EffectBuilder>) {
		const onDamage = this.ensureOnDamage();
		onDamage.attacker = onDamage.attacker || [];
		onDamage.attacker.push(...effects.map((item) => resolveEffectConfig(item)));
		return this;
	}
	onDamageDefender(...effects: Array<EffectConfig | EffectBuilder>) {
		const onDamage = this.ensureOnDamage();
		onDamage.defender = onDamage.defender || [];
		onDamage.defender.push(...effects.map((item) => resolveEffectConfig(item)));
		return this;
	}

	override build() {
		if (!this.wasSet('target')) {
			throw new Error('Attack effect is missing a target. Call targetResource(...) or targetBuilding(...) once.');
		}
		return super.build();
	}
}
export const attackParams = () => new AttackParamsBuilder();
