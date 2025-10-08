/* eslint max-lines: ["error", 500] */

import type {
	EffectConfig,
	PassiveMetadata,
	PhaseSkipConfig,
} from '@kingdom-builder/protocol';
import { formatPassiveRemoval } from '../../text';
import type { ResourceKey } from '../../resources';
import type { StatKey } from '../../stats';
import type { ActionId } from '../../actions';
import type { DevelopmentIdParam } from './actionEffectGroups';
import type { TriggerKey } from '../../defs';
import type {
	PhaseId as PhaseIdentifier,
	PhaseStepId as PhaseStepIdentifier,
} from '../../phases';
import { ParamsBuilder, PassiveMethods, Types } from '../builderShared';
import type { EffectBuilder } from '../builders';

const RESOURCE_KEY_DUPLICATE =
	'You already chose a resource with key(). Remove the extra key() call.';
const RESOURCE_EXCLUSIVE =
	'Resource change cannot use both amount() and percent(). Choose one of them.';
const RESOURCE_AMOUNT_DUPLICATE =
	'You already set amount() for this resource change. Remove the duplicate amount() call.';
const RESOURCE_PERCENT_DUPLICATE =
	'You already set percent() for this resource change. Remove the duplicate percent() call.';
const RESOURCE_MISSING_KEY =
	'Resource change is missing key(). Call key(Resource.yourChoice) to choose what should change.';
const RESOURCE_MISSING_AMOUNT =
	'Resource change needs exactly one of amount() or percent(). Pick how much the resource should change.';

const STAT_KEY_DUPLICATE =
	'You already chose a stat with key(). Remove the extra key() call.';
const STAT_AMOUNT_EXCLUSIVE =
	'Stat change cannot mix amount() with percent() or percentFromStat(). Pick one approach to describe the change.';
const STAT_PERCENT_EXCLUSIVE =
	'Stat change cannot mix percent() with amount() or percentFromStat(). Pick one approach to describe the change.';
const STAT_PERCENT_FROM_STAT_EXCLUSIVE =
	'Stat change cannot mix percentFromStat() with amount() or percent(). Pick one approach to describe the change.';
const STAT_AMOUNT_DUPLICATE =
	'You already set amount() for this stat change. Remove the duplicate amount() call.';
const STAT_PERCENT_DUPLICATE =
	'You already set percent() for this stat change. Remove the duplicate percent() call.';
const STAT_PERCENT_FROM_STAT_DUPLICATE =
	'You already chose a stat source with percentFromStat(). Remove the duplicate percentFromStat() call.';
const STAT_MISSING_KEY =
	'Stat change is missing key(). Call key(Stat.yourChoice) to decide which stat should change.';
const STAT_MISSING_AMOUNT =
	'Stat change needs amount(), percent(), or percentFromStat(). Choose one to describe how the stat should change.';

const DEVELOPMENT_ID_DUPLICATE =
	'You already set id() for this development effect. Remove the duplicate id() call.';
const DEVELOPMENT_LAND_ID_DUPLICATE =
	'You already chose a landId() for this development effect. Remove the duplicate landId() call.';
const DEVELOPMENT_MISSING_ID =
	'Development effect is missing id(). Call id("your-development-id") so the engine knows which development to reference.';

const BUILDING_ID_DUPLICATE =
	'Building effect params already set id(). Remove the extra id() call.';
const BUILDING_LAND_ID_DUPLICATE =
	'Building effect params already set landId(). Remove the extra landId() call.';
const BUILDING_MISSING_ID =
	'Building effect params is missing id(). Call id("your-building-id") before build().';

const ACTION_ID_DUPLICATE =
	'Action effect params already set id(). Remove the extra id() call.';
const ACTION_LAND_ID_DUPLICATE =
	'Action effect params already set landId(). Remove the extra landId() call.';
const ACTION_MISSING_ID =
	'Action effect params is missing id(). Call id("your-action-id") before build().';

const PASSIVE_ID_DUPLICATE =
	'You already set id() for this passive. Remove the duplicate id() call.';
const PASSIVE_MISSING_ID =
	'Passive effect is missing id(). Call id("your-passive-id") so it can be referenced later.';
const PASSIVE_ID_REQUIRED_PREFIX = 'Passive ';
const PASSIVE_ID_REQUIRED_SUFFIX =
	' requires id(). Call id("your-passive-id") before ';
const PASSIVE_ID_REQUIRED_END = '.';

function passiveIdRequired(context: string) {
	return (
		PASSIVE_ID_REQUIRED_PREFIX +
		context +
		PASSIVE_ID_REQUIRED_SUFFIX +
		context +
		PASSIVE_ID_REQUIRED_END
	);
}

function isEffectBuilder(
	value: EffectConfig | EffectBuilder,
): value is EffectBuilder {
	return typeof (value as EffectBuilder).build === 'function';
}

function resolveEffectConfig(effect: EffectConfig | EffectBuilder) {
	return isEffectBuilder(effect) ? effect.build() : effect;
}

class ResourceEffectParamsBuilder extends ParamsBuilder<{
	key?: ResourceKey;
	amount?: number;
	percent?: number;
}> {
	key(key: ResourceKey) {
		return this.set('key', key, RESOURCE_KEY_DUPLICATE);
	}
	amount(amount: number) {
		if (this.wasSet('percent')) {
			throw new Error(RESOURCE_EXCLUSIVE);
		}
		return this.set('amount', amount, RESOURCE_AMOUNT_DUPLICATE);
	}
	percent(percent: number) {
		if (this.wasSet('amount')) {
			throw new Error(RESOURCE_EXCLUSIVE);
		}
		return this.set('percent', percent, RESOURCE_PERCENT_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('key')) {
			throw new Error(RESOURCE_MISSING_KEY);
		}
		if (!this.wasSet('amount') && !this.wasSet('percent')) {
			throw new Error(RESOURCE_MISSING_AMOUNT);
		}
		return super.build();
	}
}

class StatEffectParamsBuilder extends ParamsBuilder<{
	key?: StatKey;
	amount?: number;
	percent?: number;
	percentStat?: StatKey;
}> {
	key(key: StatKey) {
		return this.set('key', key, STAT_KEY_DUPLICATE);
	}
	amount(amount: number) {
		if (this.wasSet('percent') || this.wasSet('percentStat')) {
			throw new Error(STAT_AMOUNT_EXCLUSIVE);
		}
		return this.set('amount', amount, STAT_AMOUNT_DUPLICATE);
	}
	percent(percent: number) {
		if (this.wasSet('amount') || this.wasSet('percentStat')) {
			throw new Error(STAT_PERCENT_EXCLUSIVE);
		}
		return this.set('percent', percent, STAT_PERCENT_DUPLICATE);
	}
	percentFromStat(stat: StatKey) {
		if (this.wasSet('amount') || this.wasSet('percent')) {
			throw new Error(STAT_PERCENT_FROM_STAT_EXCLUSIVE);
		}
		return this.set('percentStat', stat, STAT_PERCENT_FROM_STAT_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('key')) {
			throw new Error(STAT_MISSING_KEY);
		}
		if (
			!this.wasSet('amount') &&
			!this.wasSet('percent') &&
			!this.wasSet('percentStat')
		) {
			throw new Error(STAT_MISSING_AMOUNT);
		}
		return super.build();
	}
}

class DevelopmentEffectParamsBuilder extends ParamsBuilder<{
	id?: DevelopmentIdParam;
	landId?: string;
}> {
	id(id: DevelopmentIdParam) {
		return this.set('id', id, DEVELOPMENT_ID_DUPLICATE);
	}
	landId(landId: string) {
		return this.set('landId', landId, DEVELOPMENT_LAND_ID_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('id')) {
			throw new Error(DEVELOPMENT_MISSING_ID);
		}
		return super.build();
	}
}

class BuildingEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	landId?: string;
}> {
	id(id: string) {
		return this.set('id', id, BUILDING_ID_DUPLICATE);
	}
	landId(landId: string) {
		return this.set('landId', landId, BUILDING_LAND_ID_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('id')) {
			throw new Error(BUILDING_MISSING_ID);
		}
		return super.build();
	}
}

class ActionEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	landId?: string;
}> {
	id(id: ActionId): this;
	id(id: string): this;
	id(id: string) {
		return this.set('id', id, ACTION_ID_DUPLICATE);
	}
	landId(landId: string) {
		return this.set('landId', landId, ACTION_LAND_ID_DUPLICATE);
	}
	override build() {
		if (!this.wasSet('id')) {
			throw new Error(ACTION_MISSING_ID);
		}
		return super.build();
	}
}

class LandEffectParamsBuilder extends ParamsBuilder<{
	count?: number;
	landId?: string;
}> {
	count(count: number) {
		return this.set('count', count);
	}
	landId(landId: string) {
		return this.set('landId', landId);
	}
}

type PassiveEffectTriggerMap = Partial<Record<TriggerKey, EffectConfig[]>>;

const PASSIVE_NAME_MESSAGE = 'name()';
const PASSIVE_ICON_MESSAGE = 'icon()';
const PASSIVE_DETAIL_MESSAGE = 'detail()';
const PASSIVE_META_MESSAGE = 'meta()';

function passiveDuplicateMessage(label: string) {
	return (
		`You already set ${label} for this passive. Remove the duplicate ` +
		`${label} call.`
	);
}

type PassiveEffectParams = {
	id?: string;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveMetadata;
	skip?: PhaseSkipConfig;
} & PassiveEffectTriggerMap;

class PassiveEffectParamsBuilder extends ParamsBuilder<PassiveEffectParams> {
	declare protected params: PassiveEffectParams;
	private triggerBuckets = new Map<TriggerKey, EffectConfig[]>();
	id(id: string) {
		return this.set('id', id, PASSIVE_ID_DUPLICATE);
	}
	name(name: string) {
		return this.set(
			'name',
			name,
			passiveDuplicateMessage(PASSIVE_NAME_MESSAGE),
		);
	}
	icon(icon: string) {
		return this.set(
			'icon',
			icon,
			passiveDuplicateMessage(PASSIVE_ICON_MESSAGE),
		);
	}
	detail(detail: string) {
		return this.set(
			'detail',
			detail,
			passiveDuplicateMessage(PASSIVE_DETAIL_MESSAGE),
		);
	}
	meta(meta: PassiveMetadata) {
		return this.set(
			'meta',
			meta,
			passiveDuplicateMessage(PASSIVE_META_MESSAGE),
		);
	}
	tieredResourceSource({
		tierId,
		removalDetail,
		summaryToken,
		name,
		icon,
	}: {
		tierId: string;
		removalDetail: string;
		summaryToken?: string;
		name?: string;
		icon?: string;
	}) {
		const source: PassiveMetadata['source'] & { name?: string } = {
			type: 'tiered-resource',
			id: tierId,
		};
		if (summaryToken) {
			source.labelToken = summaryToken;
		}
		if (icon) {
			source.icon = icon;
		}
		if (name) {
			source.name = name;
		}
		const removalText: string = formatPassiveRemoval(removalDetail);
		return this.meta({
			source,
			removal: {
				token: removalDetail,
				text: removalText,
			},
		});
	}
	private ensureSkip(): PhaseSkipConfig {
		if (!this.params.skip) {
			this.params.skip = {};
		}
		return this.params.skip;
	}
	private addTriggerEffects(trigger: TriggerKey, effects: EffectConfig[]) {
		if (!effects.length) {
			return this;
		}
		const bucket = this.triggerBuckets.get(trigger);
		if (bucket) {
			bucket.push(...effects);
			return this;
		}
		this.triggerBuckets.set(trigger, [...effects]);
		return this;
	}
	private requirePassiveId(context: string) {
		const id = this.params.id;
		if (typeof id !== 'string') {
			throw new Error(passiveIdRequired(context));
		}
		return id;
	}
	private buildRemovalEffect(passiveId: string): EffectConfig {
		return {
			type: Types.Passive,
			method: PassiveMethods.REMOVE,
			params: { id: passiveId },
		};
	}
	private scheduleRemoval(trigger: TriggerKey, context: string) {
		const passiveId = this.requirePassiveId(context);
		const removal = this.buildRemovalEffect(passiveId);
		return this.addTriggerEffects(trigger, [removal]);
	}
	skipPhase(phaseId: PhaseIdentifier) {
		const skip = this.ensureSkip();
		skip.phases = skip.phases || [];
		skip.phases.push(phaseId);
		return this;
	}
	skipPhases(...phaseIds: PhaseIdentifier[]) {
		phaseIds.forEach((id) => this.skipPhase(id));
		return this;
	}
	skipStep(phaseId: PhaseIdentifier, stepId: PhaseStepIdentifier) {
		if (!phaseId || !stepId) {
			throw new Error(
				'Passive params skipStep(...) requires both phaseId ' +
					'and stepId. Provide both values when calling ' +
					'skipStep().',
			);
		}
		const skip = this.ensureSkip();
		skip.steps = skip.steps || [];
		skip.steps.push({ phaseId, stepId });
		return this;
	}
	onGrowthPhase(...effects: Array<EffectConfig | EffectBuilder>) {
		return this.addTriggerEffects(
			'onGrowthPhase',
			effects.map((item) => resolveEffectConfig(item)),
		);
	}
	onUpkeepPhase(...effects: Array<EffectConfig | EffectBuilder>) {
		return this.addTriggerEffects(
			'onUpkeepPhase',
			effects.map((item) => resolveEffectConfig(item)),
		);
	}
	onBeforeAttacked(...effects: Array<EffectConfig | EffectBuilder>) {
		return this.addTriggerEffects(
			'onBeforeAttacked',
			effects.map((item) => resolveEffectConfig(item)),
		);
	}
	onAttackResolved(...effects: Array<EffectConfig | EffectBuilder>) {
		return this.addTriggerEffects(
			'onAttackResolved',
			effects.map((item) => resolveEffectConfig(item)),
		);
	}
	removeOnUpkeepStep() {
		return this.scheduleRemoval('onUpkeepPhase', 'removeOnUpkeepStep()');
	}
	removeOnTrigger(trigger: TriggerKey) {
		const context = `removeOnTrigger('${trigger}')`;
		return this.scheduleRemoval(trigger, context);
	}
	override build() {
		if (!this.wasSet('id')) {
			throw new Error(PASSIVE_MISSING_ID);
		}
		for (const [trigger, bucket] of this.triggerBuckets.entries()) {
			this.params[trigger] = bucket;
		}
		return super.build();
	}
}

export function resourceParams() {
	return new ResourceEffectParamsBuilder();
}

export function statParams() {
	return new StatEffectParamsBuilder();
}

export function developmentParams() {
	return new DevelopmentEffectParamsBuilder();
}

export function buildingParams() {
	return new BuildingEffectParamsBuilder();
}

export function actionParams() {
	return new ActionEffectParamsBuilder();
}

export function landParams() {
	return new LandEffectParamsBuilder();
}

export function passiveParams() {
	return new PassiveEffectParamsBuilder();
}

export { resolveEffectConfig };
