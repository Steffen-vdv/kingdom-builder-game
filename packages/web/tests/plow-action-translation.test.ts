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
	GAME_START,
	RULES,
	RESOURCES,
	Resource,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
} from '@kingdom-builder/contents';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	return createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
}

describe('plow action translation', () => {
	it('summarizes plow action', () => {
		const ctx = createCtx();
		const summary = summarizeContent('action', 'plow', ctx);
		const expand = ctx.actions.get('expand');
		const till = ctx.actions.get('till');
		const plow = ctx.actions.get('plow');
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const upkeepPhase = ctx.phases.find((p) => p.id === 'upkeep');
		const upkeepLabel = upkeepPhase?.label || 'Upkeep';
		const upkeepIcon = upkeepPhase?.icon;
		const upkeepSummaryLabel = `${upkeepIcon ? `${upkeepIcon} ` : ''}${upkeepLabel}`;
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (costMod?.params as { key?: keyof typeof RESOURCES })
			?.key as keyof typeof RESOURCES;
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const modIcon = RESOURCES[modKey].icon;
		expect(summary).toEqual([
			`${expand.icon} ${expand.name}`,
			`${till.icon} ${till.name}`,
			{
				title: `⏳ Until next ${upkeepSummaryLabel}`,
				items: [`💲: ${modIcon}+${modAmt}`],
			},
		]);
	});

	it('describes plow action without perform prefix and with passive icon', () => {
		const ctx = createCtx();
		const desc = describeContent('action', 'plow', ctx);
		const titles = desc.map((d) => (typeof d === 'string' ? d : d.title));
		titles.forEach((t) => expect(t).not.toMatch(/^Perform action/));
		const passive = desc.find(
			(d) => typeof d === 'object' && d.title.includes('Upkeep Phase'),
		) as { title: string; items?: unknown[] } | undefined;
		expect(passive?.title.startsWith('♾️ ')).toBe(true);
	});

	it('keeps performed system actions in effects', () => {
		const ctx = createCtx();
		const summary = describeContent('action', 'plow', ctx);
		const { effects, description } = splitSummary(summary);
		expect(description).toBeUndefined();
		const expand = ctx.actions.get('expand');
		const till = ctx.actions.get('till');
		const plow = ctx.actions.get('plow');
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (costMod?.params as { key?: keyof typeof RESOURCES })
			?.key as keyof typeof RESOURCES;
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const modIcon = RESOURCES[modKey].icon;
		const passiveMeta = passive?.params as
			| { name?: string; icon?: string }
			| undefined;
		const passiveName = passiveMeta?.name ?? PASSIVE_INFO.label;
		const passiveIcon = passiveMeta?.icon ?? PASSIVE_INFO.icon;
		const upkeepPhase = ctx.phases.find((p) => p.id === 'upkeep');
		const upkeepLabel = upkeepPhase?.label || 'Upkeep';
		const upkeepIcon = upkeepPhase?.icon;
		const upkeepDescriptionLabel = `${
			upkeepIcon ? `${upkeepIcon} ` : ''
		}${upkeepLabel} Phase`;
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
				title: `${till.icon} ${till.name}`,
				items: [
					`Till ${LAND_INFO.icon} ${LAND_INFO.label} to unlock ${SLOT_INFO.icon} ${SLOT_INFO.label}`,
				],
			},
			{
				title: `${passiveIcon ? `${passiveIcon} ` : ''}${passiveName} – Until your next ${upkeepDescriptionLabel}`,
				items: [
					`💲 Cost Modifier on all actions: Increase cost by ${modIcon}${modAmt}`,
				],
			},
		]);
	});
});
