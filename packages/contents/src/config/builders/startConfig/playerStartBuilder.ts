import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import { ParamsBuilder } from '../../builderShared';
import { PlayerStartLandBuilder, PlayerStartLandsBuilder, cloneLandStartConfig } from './landStartBuilders';

export interface PlayerStartBuilderOptions {
	requireComplete?: boolean;
}

export class PlayerStartBuilder extends ParamsBuilder<PlayerStartConfig> {
	private mirroredValuesFromResources = false;

	constructor(private readonly requireComplete: boolean) {
		super({
			valuesV2: {},
			resourceLowerBoundsV2: {},
			resourceUpperBoundsV2: {},
		} as PlayerStartConfig);
	}

	resources(values: Record<string, number>) {
		if (!values) {
			throw new Error('Player start resources() needs a record. Use {} when nothing changes.');
		}
		if (!this.wasSet('valuesV2')) {
			this.mirroredValuesFromResources = true;
			this.params.valuesV2 = { ...values };
		}
		return this.set('resources', { ...values }, 'Player start already set resources(). Remove the extra resources() call.');
	}

	stats(values: Record<string, number>) {
		if (!values) {
			throw new Error('Player start stats() needs a record. Use {} when no stats change.');
		}
		return this.set('stats', { ...values }, 'Player start already set stats(). Remove the extra stats() call.');
	}

	population(values: Record<string, number>) {
		if (!values) {
			throw new Error('Player start population() needs a record. Use {} when empty.');
		}
		return this.set('population', { ...values }, 'Player start already set population(). Remove the extra population() call.');
	}

	valuesV2(values: Record<string, number>) {
		if (!values) {
			throw new Error('Player start valuesV2() needs a record. Use {} when nothing changes.');
		}
		this.mirroredValuesFromResources = false;
		return this.set('valuesV2', { ...values }, 'Player start already set valuesV2(). Remove the extra valuesV2() call.');
	}

	resourceBoundsV2(bounds: PlayerStartResourceBoundsInput) {
		if (!bounds) {
			throw new Error('Player start resourceBoundsV2() needs configuration. Use {} when bounds stay defaulted.');
		}
		if (bounds.lower) {
			this.set('resourceLowerBoundsV2', { ...bounds.lower }, 'Player start already set resourceBoundsV2(). Remove the extra resourceBoundsV2() call.');
		}
		if (bounds.upper) {
			this.set('resourceUpperBoundsV2', { ...bounds.upper }, 'Player start already set resourceBoundsV2(). Remove the extra resourceBoundsV2() call.');
		}
		return this;
	}

	lands(input: PlayerStartLandsInput) {
		if (!input) {
			throw new Error('Player start lands() needs configuration. Use [] when no lands are configured.');
		}
		if (input instanceof PlayerStartLandsBuilder) {
			return this.set('lands', input.build(), 'Player start already set lands(). Remove the extra lands() call.');
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
			throw new Error('Player start lands(...) callback must return the provided builder.');
		}
		return this.set('lands', configured.build(), 'Player start already set lands(). Remove the extra lands() call.');
	}

	override build(): PlayerStartConfig {
		if (this.requireComplete) {
			if (!this.wasSet('resources')) {
				throw new Error('Player start is missing resources(). Call resources(...) before build().');
			}
			if (!this.wasSet('stats')) {
				throw new Error('Player start is missing stats(). Call stats(...) before build().');
			}
			if (!this.wasSet('population')) {
				throw new Error('Player start is missing population(). Call population(...) before build().');
			}
			if (!this.wasSet('lands')) {
				throw new Error('Player start is missing lands(). Call lands(...) before build().');
			}
			if (!this.params.valuesV2) {
				throw new Error('Player start is missing valuesV2(). Call valuesV2(...) before build().');
			}
			if (!this.params.resourceLowerBoundsV2) {
				throw new Error('Player start is missing resourceBoundsV2() lower map. Call resourceBoundsV2(...) before build().');
			}
			if (!this.params.resourceUpperBoundsV2) {
				throw new Error('Player start is missing resourceBoundsV2() upper map. Call resourceBoundsV2(...) before build().');
			}
		}
		if (!this.wasSet('valuesV2') && this.mirroredValuesFromResources && this.params.resources) {
			this.params.valuesV2 = { ...this.params.resources };
		}
		return super.build();
	}
}

type PlayerStartLandsBuilderCallback = (builder: PlayerStartLandsBuilder) => PlayerStartLandsBuilder;

type PlayerStartLandsInput = NonNullable<PlayerStartConfig['lands']> | PlayerStartLandsBuilder | PlayerStartLandsBuilderCallback;

export interface PlayerStartResourceBoundsInput {
	lower?: Record<string, number>;
	upper?: Record<string, number>;
}

export function playerStart(options?: PlayerStartBuilderOptions) {
	return new PlayerStartBuilder(options?.requireComplete ?? true);
}

export { PlayerStartLandBuilder, PlayerStartLandsBuilder };
