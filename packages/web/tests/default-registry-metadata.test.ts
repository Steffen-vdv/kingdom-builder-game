import { describe, expect, it } from 'vitest';
import {
	DEFAULT_REGISTRY_METADATA,
	DEFAULT_REGISTRY_OVERVIEW_CONTENT,
} from '../src/contexts/defaultRegistryMetadata';

const getHeroTitle = () =>
	DEFAULT_REGISTRY_METADATA.overviewContent.hero.title ?? '';

describe('default registry metadata snapshot', () => {
	it('exposes overview content captured in the snapshot', () => {
		expect(getHeroTitle()).toBe('Game Overview');
		expect(
			DEFAULT_REGISTRY_METADATA.overviewContent.sections.length,
		).toBeGreaterThan(0);
	});

	it('shares the frozen overview reference across exports', () => {
		expect(DEFAULT_REGISTRY_OVERVIEW_CONTENT).toBe(
			DEFAULT_REGISTRY_METADATA.overviewContent,
		);
	});

	it('deep-freezes the overview metadata to prevent mutation', () => {
		const { overviewContent } = DEFAULT_REGISTRY_METADATA;
		expect(Object.isFrozen(overviewContent)).toBe(true);
		expect(Object.isFrozen(overviewContent.hero)).toBe(true);
		expect(Object.isFrozen(overviewContent.hero.tokens)).toBe(true);
		expect(Object.isFrozen(overviewContent.sections)).toBe(true);
	});

	it('records hero token overrides for the overview copy', () => {
		const heroTokens = DEFAULT_REGISTRY_METADATA.overviewContent.hero.tokens;
		expect(heroTokens.game).toBe('Kingdom Builder');
	});
});
