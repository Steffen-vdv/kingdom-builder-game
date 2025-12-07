import type { AttackTarget, EffectConfig, EffectDef } from '@kingdom-builder/protocol';
import type { ActionId } from '../../actions';
import type { ResourceKey, StatKey } from '../../internal';
import { ParamsBuilder } from '../builderShared';
import { resolveEffectConfig } from './effectParams';
import type { EffectBuilder } from '../builders';

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

export type AttackStatRole = 'power' | 'absorption' | 'fortification';
export type AttackStatAnnotation = {
	role: AttackStatRole;
	key: StatKey;
	label?: string;
	icon?: string;
};
export class AttackParamsBuilder extends ParamsBuilder<{
	target?: AttackTarget;
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
	stats?: AttackStatAnnotation[];
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
	stat(role: AttackStatRole, key: StatKey, overrides: { label?: string; icon?: string } = {}) {
		const stats = this.params.stats || (this.params.stats = []);
		const existingIndex = stats.findIndex((item) => item.role === role);
		const annotation: AttackStatAnnotation = {
			role,
			key,
			...overrides,
		};
		if (existingIndex >= 0) {
			stats.splice(existingIndex, 1, annotation);
		} else {
			stats.push(annotation);
		}
		return this;
	}
	powerStat(key: StatKey, overrides?: { label?: string; icon?: string }) {
		return this.stat('power', key, overrides);
	}
	absorptionStat(key: StatKey, overrides?: { label?: string; icon?: string }) {
		return this.stat('absorption', key, overrides);
	}
	fortificationStat(key: StatKey, overrides?: { label?: string; icon?: string }) {
		return this.stat('fortification', key, overrides);
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
