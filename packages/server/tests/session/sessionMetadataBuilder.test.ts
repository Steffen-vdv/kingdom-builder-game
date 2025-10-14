import { describe, expect, it } from 'vitest';
import { OVERVIEW_CONTENT, TRIGGER_INFO } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { buildSessionMetadata } from '../../src/session/sessionMetadataBuilder.js';

describe('sessionMetadataBuilder', () => {
	it('includes static trigger metadata and overview tokens', () => {
		const built = buildSessionMetadata();
		const triggers = built.metadata.triggers ?? {};
		expect(triggers.onBuild?.icon).toBe(TRIGGER_INFO.onBuild.icon);
		const stats = built.metadata.stats ?? {};
		expect(
			(stats.growth as { displayAsPercent?: boolean })?.displayAsPercent,
		).toBe(true);
		expect(built.overviewContent.hero.tokens.game).toBe(
			OVERVIEW_CONTENT.hero.tokens.game,
		);
		expect(Object.isFrozen(built.registries.actions)).toBe(true);
		expect(Object.isFrozen(built.metadata.assets)).toBe(true);
	});

	it('clones registries without mutating the source', () => {
		const factory = createContentFactory();
		const syntheticAction = factory.action({ name: 'Synthetic Action' });
		const built = buildSessionMetadata({ actions: factory.actions });
		syntheticAction.name = 'Mutated After Build';
		const registryAction = built.registries.actions[syntheticAction.id];
		expect(registryAction.name).toBe('Synthetic Action');
		expect(Object.isFrozen(registryAction)).toBe(true);
	});
});
