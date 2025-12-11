import type { EffectConfig, HappinessTierDefinition, TierDisplayMetadata, TierEffect, TierPassivePreview, TierPassiveTextTokens, TierRange } from '@kingdom-builder/protocol';
import { PassiveMethods, Types } from '../../builderShared';
import { TierDisplayBuilder, tierDisplay } from './tierDisplayBuilder';
import { TierPassiveTextBuilder, tierPassiveText } from './tierPassiveTextBuilder';
import { resolveTierEffectConfig, type TierEffectInput } from './tierEffectConfig';

type TierPassiveTextInput = TierPassiveTextTokens | TierPassiveTextBuilder | ((builder: TierPassiveTextBuilder) => TierPassiveTextBuilder);

type TierDisplayInput = TierDisplayMetadata | TierDisplayBuilder | ((builder: TierDisplayBuilder) => TierDisplayBuilder);

type PassiveParams = { id?: string };
class HappinessTierBuilder {
	private config: Partial<HappinessTierDefinition> & {
		effect: TierEffect;
		enterEffects?: EffectConfig[];
		exitEffects?: EffectConfig[];
		preview?: TierPassivePreview;
		text?: TierPassiveTextTokens;
		display?: TierDisplayMetadata;
	};
	private idSet = false;
	private rangeSet = false;
	private passiveSet = false;

	constructor() {
		this.config = {
			effect: { incomeMultiplier: 1 },
		} as Partial<HappinessTierDefinition> & { effect: TierEffect };
	}

	id(id: string) {
		if (this.idSet) {
			throw new Error('Happiness tier already has an id(). Remove the extra id() call.');
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	range(min: number, max?: number) {
		if (this.rangeSet) {
			throw new Error('Happiness tier already has range(). Remove the extra range() call.');
		}
		if (max !== undefined && max < min) {
			throw new Error('Happiness tier range(min, max?) requires max to be greater than or equal to min.');
		}
		this.config.range = max === undefined ? ({ min } as TierRange) : ({ min, max } as TierRange);
		this.rangeSet = true;
		return this;
	}

	effect(effect: TierEffect) {
		this.config.effect = { ...effect };
		return this;
	}

	incomeMultiplier(value: number) {
		this.config.effect.incomeMultiplier = value;
		return this;
	}

	buildingDiscountPct(value: number) {
		this.config.effect.buildingDiscountPct = value;
		return this;
	}

	growthBonusPct(value: number) {
		this.config.effect.growthBonusPct = value;
		return this;
	}

	upkeepCouncilReduction(value: number) {
		this.config.effect.upkeepCouncilReduction = value;
		return this;
	}

	halveCouncilAPInUpkeep(flag = true) {
		this.config.effect.halveCouncilAPInUpkeep = flag;
		return this;
	}

	disableGrowth(flag = true) {
		this.config.effect.disableGrowth = flag;
		return this;
	}

	enterEffect(value: TierEffectInput) {
		const effectConfig = resolveTierEffectConfig(value);
		this.config.enterEffects = this.config.enterEffects || [];
		this.config.enterEffects.push(effectConfig);
		return this;
	}

	enterEffects(...values: TierEffectInput[]) {
		values.forEach((value) => this.enterEffect(value));
		return this;
	}

	exitEffect(value: TierEffectInput) {
		const effectConfig = resolveTierEffectConfig(value);
		this.config.exitEffects = this.config.exitEffects || [];
		this.config.exitEffects.push(effectConfig);
		return this;
	}

	exitEffects(...values: TierEffectInput[]) {
		values.forEach((value) => this.exitEffect(value));
		return this;
	}

	passive(value: TierEffectInput) {
		if (this.passiveSet) {
			throw new Error('Happiness tier already has passive(). Remove the extra passive() call.');
		}
		const effectConfig = resolveTierEffectConfig(value);
		if (effectConfig.type !== Types.Passive || effectConfig.method !== PassiveMethods.ADD) {
			throw new Error('Happiness tier passive(...) requires a passive:add effect. ' + 'Configure it with effect().type(Types.Passive).' + 'method(PassiveMethods.ADD).');
		}
		const params = effectConfig.params as PassiveParams | undefined;
		const passiveId = params?.id;
		if (!passiveId) {
			throw new Error('Happiness tier passive(...) requires the passive:add effect to include params.id.');
		}
		this.config.enterEffects = this.config.enterEffects || [];
		this.config.enterEffects.push(effectConfig);
		const removeEffect: EffectConfig = {
			type: Types.Passive,
			method: PassiveMethods.REMOVE,
			params: { id: passiveId },
		};
		this.config.exitEffects = this.config.exitEffects || [];
		this.config.exitEffects.push(removeEffect);
		const preview: TierPassivePreview = { id: passiveId };
		if (effectConfig.effects && effectConfig.effects.length > 0) {
			preview.effects = effectConfig.effects.map((item) => structuredClone(item));
		}
		this.config.preview = preview;
		this.passiveSet = true;
		return this;
	}

	display(value: TierDisplayMetadata | TierDisplayBuilder | ((builder: TierDisplayBuilder) => TierDisplayBuilder)) {
		let display: TierDisplayMetadata;
		if (typeof value === 'function') {
			display = value(tierDisplay()).build();
		} else if (value instanceof TierDisplayBuilder) {
			display = value.build();
		} else {
			display = value;
		}
		this.config.display = display;
		return this;
	}

	text(value: TierPassiveTextInput) {
		let tokens: TierPassiveTextTokens;
		if (typeof value === 'function') {
			tokens = value(tierPassiveText()).build();
		} else if (value instanceof TierPassiveTextBuilder) {
			tokens = value.build();
		} else {
			tokens = value;
		}
		this.config.text = { ...this.config.text, ...tokens };
		return this;
	}

	// Flat text methods - no callback required
	textSummary(token: string) {
		this.config.text = { ...this.config.text, summary: token };
		return this;
	}

	textDescription(token: string) {
		this.config.text = { ...this.config.text, description: token };
		return this;
	}

	textRemoval(token: string) {
		this.config.text = { ...this.config.text, removal: token };
		return this;
	}

	// Flat display methods - no callback required
	displayTitle(value: string) {
		this.config.display = { ...this.config.display, title: value };
		return this;
	}

	displayIcon(icon: string) {
		this.config.display = { ...this.config.display, icon };
		return this;
	}

	displaySummaryToken(token: string) {
		this.config.display = { ...this.config.display, summaryToken: token };
		return this;
	}

	displayRemovalCondition(token: string) {
		this.config.display = { ...this.config.display, removalCondition: token };
		return this;
	}

	build(): HappinessTierDefinition {
		if (!this.idSet) {
			throw new Error("Happiness tier is missing id(). Call id('your-tier-id') before build().");
		}
		if (!this.rangeSet) {
			throw new Error('Happiness tier is missing range(). Call range(min, max?) before build().');
		}
		const definition: HappinessTierDefinition = {
			id: this.config.id!,
			range: this.config.range!,
			effect: this.config.effect,
		};
		if (this.config.enterEffects?.length) {
			definition.enterEffects = this.config.enterEffects;
		}
		if (this.config.exitEffects?.length) {
			definition.exitEffects = this.config.exitEffects;
		}
		if (this.config.preview) {
			definition.preview = this.config.preview;
		}
		if (this.config.text) {
			definition.text = this.config.text;
		}
		if (this.config.display) {
			definition.display = this.config.display;
		}
		return definition;
	}
}

export function happinessTier(id?: string) {
	const builder = new HappinessTierBuilder();
	if (id) {
		builder.id(id);
	}
	return builder;
}

export { HappinessTierBuilder };
