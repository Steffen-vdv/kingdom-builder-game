import { describe, it, expect, vi } from 'vitest';
import {
	createSyntheticPlowContent,
	SYNTHETIC_UPKEEP_PHASE,
	SYNTHETIC_PASSIVE_INFO,
	SYNTHETIC_LAND_INFO,
	registerSyntheticPlowResources,
} from './fixtures/syntheticPlow';
import {
	summarizeContent,
	describeContent,
	splitSummary,
} from '../src/translation/content';
import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	const synthetic = createSyntheticPlowContent();
	const ctx = createEngine({
		actions: synthetic.factory.actions,
		buildings: synthetic.factory.buildings,
		developments: synthetic.factory.developments,
		populations: synthetic.factory.populations,
		phases: synthetic.phases,
		start: synthetic.start,
		rules: synthetic.rules,
	});
	const translation = createTranslationContextForEngine(ctx, (registries) => {
		const plowDef = ctx.actions.get(synthetic.plow.id);
		const expandDef = ctx.actions.get(synthetic.expand.id);
		const tillDef = ctx.actions.get(synthetic.till.id);
		registerSyntheticPlowResources(registries.resources);
		if (plowDef) {
			registries.actions.add(plowDef.id, { ...plowDef });
		}
		if (expandDef) {
			registries.actions.add(expandDef.id, { ...expandDef });
		}
		if (tillDef) {
			registries.actions.add(tillDef.id, { ...tillDef });
		}
	});
	return { ...synthetic, ctx, translation };
}

describe('plow action translation', () => {
	it('summarizes plow action', () => {
		const { translation, expand, till, plow } = createCtx();
		const summary = summarizeContent('action', plow.id, translation);
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const upkeepLabel = SYNTHETIC_UPKEEP_PHASE.label;
		const upkeepIcon = SYNTHETIC_UPKEEP_PHASE.icon;
		const upkeepSummaryLabel = `${upkeepIcon ? `${upkeepIcon} ` : ''}${upkeepLabel}`;
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (costMod?.params as { key?: string })?.key ?? '';
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const resourceDescriptor = translation.assets.resources?.[modKey] ?? {};
		const modIcon = resourceDescriptor.icon ?? '';
		expect(summary).toEqual([
			`${expand.icon} ${expand.name}`,
			`${till.icon} ${till.name}`,
			{
				title: `⏳ Until next ${upkeepSummaryLabel}`,
				items: [`💲: ${modIcon}${modAmt >= 0 ? '+' : ''}${modAmt}`],
			},
		]);
	});

	it('describes plow action without perform prefix and with passive icon', () => {
		const { translation, plow, plowPassive } = createCtx();
		const desc = describeContent('action', plow.id, translation);
		const titles = desc.map((entry) => {
			return typeof entry === 'string' ? entry : entry.title;
		});
		titles.forEach((title) => {
			expect(title).not.toMatch(/^Perform action/);
		});
		const passiveEntry = desc.find((entry) => {
			if (typeof entry !== 'object') {
				return false;
			}

			return entry.title.includes(SYNTHETIC_UPKEEP_PHASE.label);
		}) as { title: string; items?: unknown[] } | undefined;
		const passiveIcon =
			(plowPassive as { icon?: string })?.icon ?? SYNTHETIC_PASSIVE_INFO.icon;
		expect(passiveEntry?.title.startsWith(`${passiveIcon} `)).toBe(true);
	});

	it('keeps performed system actions in effects', () => {
		const { translation, expand, till, plow, plowPassive } = createCtx();
		const summary = describeContent('action', plow.id, translation);
		const { effects, description } = splitSummary(summary);
		expect(description).toBeUndefined();
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (costMod?.params as { key?: string })?.key ?? '';
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const resourceDescriptor = translation.assets.resources?.[modKey] ?? {};
		const modIcon = resourceDescriptor.icon ?? '';
		const passiveName = ((plowPassive as { name?: string })?.name ??
			SYNTHETIC_PASSIVE_INFO.label) as string;
		const passiveIcon = ((plowPassive as { icon?: string })?.icon ??
			SYNTHETIC_PASSIVE_INFO.icon) as string;
		const upkeepLabel = SYNTHETIC_UPKEEP_PHASE.label;
		const upkeepIcon = SYNTHETIC_UPKEEP_PHASE.icon;
		const upkeepDescriptionLabel = `${
			upkeepIcon ? `${upkeepIcon} ` : ''
		}${upkeepLabel}`;
		const expandLand = expand.effects.find((e: EffectDef) => e.type === 'land');
		const landCount = (expandLand?.params as { count?: number })?.count ?? 0;
		const expandHap = expand.effects.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === 'happiness',
		);
		const hapAmt = (expandHap?.params as { amount?: number })?.amount ?? 0;
		const hapDescriptor = translation.assets.resources?.happiness ?? {};
		const hapLabel = hapDescriptor.label ?? 'happiness';
		const hapIcon = hapDescriptor.icon ?? '';
		const modifierInfo = translation.assets.modifiers?.cost ?? {};
		const modifierIcon = modifierInfo.icon ?? '💲';
		const modifierLabel = modifierInfo.label ?? 'Cost Adjustment';
		const modifierDirection = modAmt >= 0 ? 'Increase' : 'Decrease';
		const modMagnitude = Math.abs(modAmt);
		const landAsset = translation.assets.land ?? {};
		const landIcon = landAsset.icon ?? SYNTHETIC_LAND_INFO.icon;
		const landLabel = landAsset.label ?? SYNTHETIC_LAND_INFO.label;
		const slotAsset = translation.assets.slot ?? {};
		const slotIcon = slotAsset.icon ?? '🧩';
		const expectedSlotLabel = 'Development Slot';
		expect(effects).toEqual([
			{
				title: `${expand.icon} ${expand.name}`,
				items: [
					`${landIcon} ${landCount >= 0 ? '+' : ''}${landCount} ${landLabel}`,
					`${hapIcon}${hapAmt >= 0 ? '+' : ''}${hapAmt} ${hapLabel}`,
				],
			},
			{
				title: `${till.icon} ${till.name}`,
				items: [
					`Till ${landIcon} ${landLabel} to unlock ${slotIcon} ${expectedSlotLabel}`,
				],
			},
			{
				title: `${passiveIcon ? `${passiveIcon} ` : ''}${passiveName} – Until your next ${
					upkeepDescriptionLabel
				}`,
				items: [
					`${modifierIcon} ${modifierLabel} on all actions: ${modifierDirection} cost by ${modIcon}${modMagnitude}`,
				],
			},
		]);
	});
});
