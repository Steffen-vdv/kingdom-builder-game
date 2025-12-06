import type { TierDisplayMetadata } from '@kingdom-builder/protocol';

export type TierDisplayBuilderConfig = TierDisplayMetadata;

class TierDisplayBuilder {
	private config: TierDisplayBuilderConfig = {};

	removalCondition(token: string) {
		this.config.removalCondition = token;
		return this;
	}

	title(value: string) {
		this.config.title = value;
		return this;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	summaryToken(token: string) {
		this.config.summaryToken = token;
		return this;
	}

	build(): TierDisplayMetadata {
		return this.config;
	}
}

export function tierDisplay() {
	return new TierDisplayBuilder();
}

export { TierDisplayBuilder };
