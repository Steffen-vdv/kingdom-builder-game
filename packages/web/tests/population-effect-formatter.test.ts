import { describe, it, expect } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import {
	describeEffects,
	logEffects,
	summarizeEffects,
} from '../src/translation/effects';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';
import type { SessionRegistries } from '../src/state/sessionRegistries';

function firstPopulationId(registries: SessionRegistries) {
	const [first] = registries.populations.keys();
	if (!first) {
		throw new Error(
			'Expected at least one population role for population effect tests.',
		);
	}
	return first;
}

describe('population effect formatter', () => {
	it('uses metadata labels and icons when adding a population role', () => {
		let populationId: string | undefined;
		const { translationContext, registries } = buildSyntheticTranslationContext(
			({ session, registries: setupRegistries }) => {
				populationId = firstPopulationId(setupRegistries);
				session.metadata.populations = {
					...(session.metadata.populations ?? {}),
					[populationId]: { icon: '✨', label: 'Mystics' },
				};
				session.metadata.assets = {
					...(session.metadata.assets ?? {}),
					population: { icon: '👑', label: 'Subjects' },
				};
			},
		);
		if (!populationId) {
			throw new Error('Population id should be defined for metadata test.');
		}
		const populationAsset = translationContext.assets.population;
		const roleAsset = translationContext.assets.populations[populationId] ?? {};
		const effect: EffectDef = {
			type: 'population',
			method: 'add',
			params: { role: populationId },
		};
		const summary = summarizeEffects([effect], translationContext);
		const description = describeEffects([effect], translationContext);
		const log = logEffects([effect], translationContext);
		const baseIcon = populationAsset.icon ?? '👥';
		const roleIcon = roleAsset.icon ?? populationId;
		const roleLabel = roleAsset.label ?? populationId;
		expect(summary).toContain(`${baseIcon}(${roleIcon}) +1`);
		expect(description).toContain(`Add ${roleIcon} ${roleLabel}`);
		expect(log).toContain(`Added ${roleIcon} ${roleLabel}`);
		expect(registries.populations.has(populationId)).toBe(true);
	});

	it('falls back to population asset metadata when no role is provided', () => {
		const { translationContext } = buildSyntheticTranslationContext(
			({ session }) => {
				session.metadata.assets = {
					...(session.metadata.assets ?? {}),
					population: { icon: '👥', label: 'Citizens' },
				};
			},
		);
		const effect: EffectDef = { type: 'population', method: 'remove' };
		const summary = summarizeEffects([effect], translationContext);
		const description = describeEffects([effect], translationContext);
		const log = logEffects([effect], translationContext);
		const baseIcon = translationContext.assets.population.icon ?? '👥';
		const baseLabel =
			translationContext.assets.population.label ?? 'Population';
		expect(summary).toContain(`${baseIcon}(${baseIcon}) -1`);
		expect(description).toContain(`Remove ${baseIcon} ${baseLabel}`);
		expect(log).toContain(`Removed ${baseIcon} ${baseLabel}`);
	});
});
