import { describe, it, expect, vi } from 'vitest';
import {
	summarizeContent,
	describeContent,
	splitSummary,
} from '../src/translation/content';
import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	RULES,
	RESOURCES,
	Resource,
	LAND_INFO,
	SLOT_INFO,
} from '@kingdom-builder/contents';
import { cloneStart, SYNTHETIC_IDS } from './syntheticContent';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});
vi.mock(
	'@kingdom-builder/contents',
	async () => (await import('./syntheticContent')).syntheticModule,
);

function createCtx() {
	return createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: cloneStart(),
		rules: RULES,
	});
}

describe('harvest action translation', () => {
	const harvestId = SYNTHETIC_IDS.actions.harvest;
	const expandId = SYNTHETIC_IDS.actions.expand;
	const cultivateId = SYNTHETIC_IDS.actions.cultivate;

	it('summarizes harvest action', () => {
		const ctx = createCtx();
		const summary = summarizeContent('action', harvestId, ctx);
		const expand = ctx.actions.get(expandId);
		const cultivate = ctx.actions.get(cultivateId);
		const harvest = ctx.actions.get(harvestId);
		const passive = harvest.effects.find(
			(e: EffectDef) => e.type === 'passive',
		);
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (costMod?.params as { key?: keyof typeof RESOURCES })
			?.key as keyof typeof RESOURCES;
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const modIcon = RESOURCES[modKey].icon;
		expect(summary).toEqual([
			`${expand.icon} ${expand.name}`,
			`${cultivate.icon} ${cultivate.name}`,
			`💲: ${modIcon}+${modAmt}`,
		]);
	});

	it('describes harvest action without perform prefix and with passive icon', () => {
		const ctx = createCtx();
		const desc = describeContent('action', harvestId, ctx);
		const titles = desc.map((d) => (typeof d === 'string' ? d : d.title));
		titles.forEach((t) => expect(t).not.toMatch(/^Perform action/));
		const passiveLine = desc.find(
			(d) => typeof d === 'string' && d.startsWith('💲 Cost Modifier'),
		) as string | undefined;
		expect(passiveLine).toBeDefined();
		const harvest = ctx.actions.get(harvestId);
		const passive = harvest?.effects.find(
			(e: EffectDef) => e.type === 'passive',
		);
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (costMod?.params as { key?: keyof typeof RESOURCES })
			?.key as keyof typeof RESOURCES;
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const modIcon = RESOURCES[modKey].icon;
		expect(passiveLine).toBe(
			`💲 Cost Modifier on all actions: Increase cost by ${modIcon}${modAmt}`,
		);
	});

	it('keeps performed system actions in effects', () => {
		const ctx = createCtx();
		const summary = describeContent('action', harvestId, ctx);
		const { effects, description } = splitSummary(summary);
		expect(description).toBeUndefined();
		const expand = ctx.actions.get(expandId);
		const cultivate = ctx.actions.get(cultivateId);
		const harvest = ctx.actions.get(harvestId);
		const passive = harvest.effects.find(
			(e: EffectDef) => e.type === 'passive',
		);
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (costMod?.params as { key?: keyof typeof RESOURCES })
			?.key as keyof typeof RESOURCES;
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const modIcon = RESOURCES[modKey].icon;
		const expandLand = expand.effects.find((e: EffectDef) => e.type === 'land');
		const landCount = (expandLand?.params as { count?: number })?.count ?? 0;
		const expandHap = expand.effects.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === Resource.happiness,
		);
		const hapAmt = (expandHap?.params as { amount?: number })?.amount ?? 0;
		const hapInfo = RESOURCES[Resource.happiness];
		expect(effects).toEqual([
			{
				title: `${expand.icon} ${expand.name}`,
				items: [
					`${LAND_INFO.icon} ${landCount >= 0 ? '+' : ''}${landCount} ${LAND_INFO.label}`,
					`${hapInfo.icon}+${hapAmt} ${hapInfo.label}`,
				],
			},
			{
				title: `${cultivate.icon} ${cultivate.name}`,
				items: [
					`Till ${LAND_INFO.icon} ${LAND_INFO.label} to unlock ${SLOT_INFO.icon} ${SLOT_INFO.label}`,
				],
			},
			`💲 Cost Modifier on all actions: Increase cost by ${modIcon}${modAmt}`,
		]);
	});
});
