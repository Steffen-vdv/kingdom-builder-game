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
			values: {},
			resourceLowerBounds: {},
			resourceUpperBounds: {},
		} as PlayerStartConfig);
	}

	resources(values: Record<string, number>) {
		if (!values) {
			throw new Error('Player start resources() needs a record. Use {} when nothing changes.');
		}
		if (!this.wasSet('values')) {
			this.mirroredValuesFromResources = true;
			this.params.values = { ...values };
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

	values(values: Record<string, number>) {
		if (!values) {
			throw new Error('Player start values() needs a record. Use {} when nothing changes.');
		}
		this.mirroredValuesFromResources = false;
		return this.set('values', { ...values }, 'Player start already set values(). Remove the extra values() call.');
	}

	resourceBounds(bounds: PlayerStartResourceBoundsInput) {
		if (!bounds) {
			throw new Error('Player start resourceBounds() needs configuration. Use {} when bounds stay defaulted.');
		}
		if (bounds.lower) {
			this.set('resourceLowerBounds', { ...bounds.lower }, 'Player start already set resourceBounds(). Remove the extra resourceBounds() call.');
		}
		if (bounds.upper) {
			this.set('resourceUpperBounds', { ...bounds.upper }, 'Player start already set resourceBounds(). Remove the extra resourceBounds() call.');
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
			if (!this.params.values) {
				throw new Error('Player start is missing values(). Call values(...) before build().');
			}
			if (!this.params.resourceLowerBounds) {
				throw new Error('Player start is missing resourceBounds() lower map. Call resourceBounds(...) before build().');
			}
			if (!this.params.resourceUpperBounds) {
				throw new Error('Player start is missing resourceBounds() upper map. Call resourceBounds(...) before build().');
			}
		}
		if (!this.wasSet('values') && this.mirroredValuesFromResources && this.params.resources) {
			this.params.values = { ...this.params.resources };
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
