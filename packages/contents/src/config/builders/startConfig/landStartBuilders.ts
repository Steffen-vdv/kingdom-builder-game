import type {
	EffectConfig,
	PlayerStartConfig,
} from '@kingdom-builder/protocol';
import { ParamsBuilder } from '../../builderShared';
import { resolveEffectConfig } from '../effectParams';
import type { EffectBuilder } from '../evaluators';

type LandStartConfig = NonNullable<PlayerStartConfig['lands']>[number];

export function cloneLandStartConfig(land: LandStartConfig): LandStartConfig {
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

export class PlayerStartLandBuilder extends ParamsBuilder<LandStartConfig> {
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
			'Player start land already set slotsMax(). Remove the extra slotsMax() ' +
				'call.',
		);
	}

	slotsUsed(slots: number) {
		return this.set(
			'slotsUsed',
			slots,
			'Player start land already set slotsUsed(). Remove the extra slotsUsed() ' +
				'call.',
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
		this.params.onPayUpkeepStep ??= [];
		this.params.onPayUpkeepStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	onGainIncomeStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onGainIncomeStep ??= [];
		this.params.onGainIncomeStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	onGainAPStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onGainAPStep ??= [];
		this.params.onGainAPStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	override build() {
		return cloneLandStartConfig(super.build());
	}
}

type PlayerStartLandBuilderCallback = (
	builder: PlayerStartLandBuilder,
) => PlayerStartLandBuilder;

type PlayerStartLandInput =
	| LandStartConfig
	| PlayerStartLandBuilder
	| PlayerStartLandBuilderCallback;

export class PlayerStartLandsBuilder {
	private readonly lands: LandStartConfig[] = [];

	private resolveBuilder(
		input: PlayerStartLandBuilder | PlayerStartLandBuilderCallback,
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

	land(input?: PlayerStartLandInput) {
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

export type { LandStartConfig };
