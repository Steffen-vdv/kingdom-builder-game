import type { AttackTarget, EffectConfig, EffectDef } from '@kingdom-builder/protocol';
import type { ActionId } from '../../actions';
import type { ResourceKey } from '../../resources';
import { getResourceV2Id } from '../../resources';
import type { StatKey } from '../../stats';
import type { PopulationRoleId } from '../../populationRoles';
import { ParamsBuilder, type Params } from '../builderShared';
import { resolveEffectConfig } from './effectParams';
import type { EffectBuilder } from '../builders';
import { resourceTransfer, transferEndpoint, type ResourceTransferEndpointBuilder, type ResourceV2TransferEffectParams } from '../../resourceV2';

export class CostModParamsBuilder extends ParamsBuilder<{
	id?: string;
	actionId?: ActionId;
	key?: ResourceKey;
	amount?: number;
	percent?: number;
}> {
	id(id: string) {
		return this.set('id', id);
	}
	actionId(actionId: ActionId) {
		return this.set('actionId', actionId);
	}
	key(key: ResourceKey) {
		return this.set('key', key);
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
export const evaluationTarget = (type: EvaluationTargetTypes | string) => new EvaluationTargetBuilder(type);
export const developmentTarget = () => evaluationTarget(EvaluationTargetTypes.Development);
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
export class PopulationEffectParamsBuilder extends ParamsBuilder<{
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	role?: PopulationRoleId | string;
}> {
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	role(role: PopulationRoleId | string) {
		return this.set('role', role, 'You already chose a role() for this population effect. Remove the duplicate call.');
	}

	override build() {
		if (!this.wasSet('role')) {
			throw new Error('Population effect is missing role(). Call role(PopulationRole.yourChoice) to choose who is affected.');
		}
		return super.build();
	}
}
export const populationParams = () => new PopulationEffectParamsBuilder();

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
	targetResource(key: ResourceKey) {
		return this.set('target', { type: 'resource', key });
	}
	targetStat(key: StatKey) {
		return this.set('target', { type: 'stat', key });
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
			throw new Error('Attack effect is missing a target. Call targetResource(...), targetStat(...), or targetBuilding(...) once.');
		}
		return super.build();
	}
}
export const attackParams = () => new AttackParamsBuilder();
type TransferMode = 'amount' | 'percent' | undefined;

type TransferEffectParams = ResourceV2TransferEffectParams &
	Params & {
		key: ResourceKey;
		percent?: number;
		amount?: number;
	};

export class TransferParamsBuilder extends ParamsBuilder<TransferEffectParams> {
	private resourceKey?: ResourceKey;
	private resourceId?: string;
	private donorBuilder?: ResourceTransferEndpointBuilder;
	private recipientBuilder?: ResourceTransferEndpointBuilder;
	private mode: TransferMode;
	private amountValue?: number;
	private percentValue?: number;

	key(key: ResourceKey) {
		if (this.resourceKey) {
			throw new Error('You already chose a resource with key(). Remove the extra key() call.');
		}
		const resourceId = getResourceV2Id(key);
		this.resourceKey = key;
		this.resourceId = resourceId;
		this.donorBuilder = transferEndpoint(resourceId).player('opponent');
		this.recipientBuilder = transferEndpoint(resourceId).player('active');
		return this;
	}

	private ensureEndpoints(method: string) {
		if (!this.resourceKey || !this.resourceId || !this.donorBuilder || !this.recipientBuilder) {
			throw new Error(`Resource transfer ${method} requires key() before it can be configured.`);
		}
	}

	percent(percent: number) {
		this.ensureEndpoints('percent()');
		if (this.mode === 'amount') {
			throw new Error('Resource transfer cannot use both percent() and amount(). Remove one of the calls before build().');
		}
		if (this.mode === 'percent') {
			throw new Error('You already set percent() for this transfer. Remove the duplicate percent() call.');
		}
		this.mode = 'percent';
		this.percentValue = percent;
		this.donorBuilder!.change((change) => change.percent(-percent));
		this.recipientBuilder!.change((change) => change.percent(percent));
		return this;
	}

	amount(amount: number) {
		this.ensureEndpoints('amount()');
		if (this.mode === 'percent') {
			throw new Error('Resource transfer cannot use both percent() and amount(). Remove one of the calls before build().');
		}
		if (this.mode === 'amount') {
			throw new Error('You already set amount() for this transfer. Remove the duplicate amount() call.');
		}
		this.mode = 'amount';
		this.amountValue = amount;
		this.donorBuilder!.change((change) => change.amount(-amount));
		this.recipientBuilder!.change((change) => change.amount(amount));
		return this;
	}

	override build() {
		if (!this.resourceKey || !this.resourceId || !this.donorBuilder || !this.recipientBuilder) {
			throw new Error('Resource transfer is missing key(). Call key(Resource.yourChoice) to pick the resource to move.');
		}
		if (!this.mode) {
			throw new Error('Resource transfer is missing percent() or amount(). Call one of them to choose how much to move.');
		}
		const donor = this.donorBuilder.build();
		const recipient = this.recipientBuilder.build();
		const transferParams = resourceTransfer().donor(donor).recipient(recipient).build();
		const legacyFields = this.mode === 'amount' ? { amount: this.amountValue! } : { percent: this.percentValue! };
		this.params = {
			...transferParams,
			key: this.resourceKey,
			...legacyFields,
		} as TransferEffectParams;
		return super.build();
	}
}
export const transferParams = () => new TransferParamsBuilder();
