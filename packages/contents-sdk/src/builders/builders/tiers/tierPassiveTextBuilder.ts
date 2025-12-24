import type { TierPassiveTextTokens } from '@kingdom-builder/protocol';

class TierPassiveTextBuilder {
	private tokens: TierPassiveTextTokens = {};

	summary(token: string) {
		this.tokens.summary = token;
		return this;
	}

	description(token: string) {
		this.tokens.description = token;
		return this;
	}

	removal(token: string) {
		this.tokens.removal = token;
		return this;
	}

	build(): TierPassiveTextTokens {
		return this.tokens;
	}
}

export function tierPassiveText() {
	return new TierPassiveTextBuilder();
}

export { TierPassiveTextBuilder };
