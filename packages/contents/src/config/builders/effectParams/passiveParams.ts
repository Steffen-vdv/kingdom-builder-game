import type {
	EffectConfig,
	PassiveMetadata,
	PhaseSkipConfig,
} from '@kingdom-builder/protocol';
import { formatPassiveRemoval } from '../../../text';
import type { TriggerKey } from '../../../defs';
import type {
	PhaseId as PhaseIdentifier,
	PhaseStepId as PhaseStepIdentifier,
} from '../../../phases';
import { ParamsBuilder, PassiveMethods, Types } from '../../builderShared';
import type { EffectBuilder } from '../../builders';
import { resolveEffectConfig } from './resolveEffectConfig';

const PASSIVE_ID_DUPLICATE =
	'You already set id() for this passive. Remove the duplicate id() call.';
const PASSIVE_MISSING_ID =
	'Passive effect is missing id(). Call id("your-passive-id") so it can be referenced later.';
const PASSIVE_ID_REQUIRED_PREFIX = 'Passive ';
const PASSIVE_ID_REQUIRED_SUFFIX =
	' requires id(). Call id("your-passive-id") before ';
const PASSIVE_ID_REQUIRED_END = '.';

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

function passiveIdRequired(context: string) {
	return (
		PASSIVE_ID_REQUIRED_PREFIX +
		context +
		PASSIVE_ID_REQUIRED_SUFFIX +
		context +
		PASSIVE_ID_REQUIRED_END
	);
}

type PassiveEffectTriggerMap = Partial<Record<TriggerKey, EffectConfig[]>>;

type PassiveEffectParams = {
	id?: string;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveMetadata;
	skip?: PhaseSkipConfig;
} & PassiveEffectTriggerMap;
// prettier-ignore
export class PassiveEffectParamsBuilder extends ParamsBuilder<
        PassiveEffectParams
> {
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

export function passiveParams() {
	return new PassiveEffectParamsBuilder();
}
