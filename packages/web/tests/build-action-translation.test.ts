import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import {
	describeContent,
	summarizeContent,
	type SummaryGroup,
} from '../src/translation';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

function hasBuildingAddEffect(effects: EffectDef[] | undefined): boolean {
	if (!effects) {
		return false;
	}
	for (const effect of effects) {
		if (effect.type === 'building' && effect.method === 'add') {
			return true;
		}
		if (hasBuildingAddEffect(effect.effects as EffectDef[] | undefined)) {
			return true;
		}
	}
	return false;
}

function selectBuildingAction(
	registries: ReturnType<typeof buildSyntheticTranslationContext>['registries'],
): string {
	for (const [id, definition] of registries.actions.entries()) {
		if (hasBuildingAddEffect(definition.effects as EffectDef[] | undefined)) {
			return id;
		}
	}
	throw new Error('Expected at least one building action in the registry');
}

describe('building action translation', () => {
	it('hoists building summaries into action summaries', () => {
		const { translationContext, registries } =
			buildSyntheticTranslationContext();
		const actionId = selectBuildingAction(registries);
		const summary = summarizeContent('action', actionId, translationContext);
		expect(summary.length).toBeGreaterThan(0);
		const first = summary[0];
		expect(typeof first).toBe('object');
		const group = first as SummaryGroup & { _hoist?: boolean };
		expect(group._hoist).toBe(true);
		expect(group.items.length).toBeGreaterThan(0);
	});

	it('provides detailed descriptions for building actions', () => {
		const { translationContext, registries } =
			buildSyntheticTranslationContext();
		const actionId = selectBuildingAction(registries);
		const description = describeContent('action', actionId, translationContext);
		const group = description.find(
			(item): item is SummaryGroup & { _desc?: boolean } =>
				typeof item === 'object',
		);
		expect(group).toBeDefined();
		expect(group?._desc).toBe(true);
		expect(group?.items.length ?? 0).toBeGreaterThan(0);
	});
});
