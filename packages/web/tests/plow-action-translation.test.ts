import { describe, it, expect, vi } from 'vitest';
import {
	createSyntheticPlowContent,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_UPKEEP_PHASE,
	SYNTHETIC_PASSIVE_INFO,
	SYNTHETIC_LAND_INFO,
	SYNTHETIC_SLOT_INFO,
} from './fixtures/syntheticPlow';
import {
	summarizeContent,
	describeContent,
	splitSummary,
} from '../src/translation/content';
import { createEngine, type EffectDef } from '@kingdom-builder/engine';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	const synthetic = createSyntheticPlowContent();
	return {
		...synthetic,
		ctx: createEngine({
			actions: synthetic.factory.actions,
			buildings: synthetic.factory.buildings,
			developments: synthetic.factory.developments,
			populations: synthetic.factory.populations,
			phases: synthetic.phases,
			start: synthetic.start,
			rules: synthetic.rules,
		}),
	};
}

describe('plow action translation', () => {
	it('summarizes plow action', () => {
		const { ctx, expand, till, plow } = createCtx();
		const summary = summarizeContent('action', plow.id, ctx);
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const upkeepLabel = SYNTHETIC_UPKEEP_PHASE.label;
		const upkeepIcon = SYNTHETIC_UPKEEP_PHASE.icon;
		const upkeepSummaryLabel = `${upkeepIcon ? `${upkeepIcon} ` : ''}${upkeepLabel}`;
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (
			costMod?.params as { key?: keyof typeof SYNTHETIC_RESOURCES }
		)?.key as keyof typeof SYNTHETIC_RESOURCES;
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const modIcon = SYNTHETIC_RESOURCES[modKey]?.icon ?? '';
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
		const { ctx, plow, plowPassive } = createCtx();
		const desc = describeContent('action', plow.id, ctx);
		const titles = desc.map((d) => (typeof d === 'string' ? d : d.title));
		titles.forEach((t) => expect(t).not.toMatch(/^Perform action/));
		const passiveEntry = desc.find(
			(d) =>
				typeof d === 'object' && d.title.includes(SYNTHETIC_UPKEEP_PHASE.label),
		) as { title: string; items?: unknown[] } | undefined;
		const passiveIcon =
			(plowPassive as { icon?: string })?.icon ?? SYNTHETIC_PASSIVE_INFO.icon;
		expect(passiveEntry?.title.startsWith(`${passiveIcon} `)).toBe(true);
	});

	it('keeps performed system actions in effects', () => {
		const { ctx, expand, till, plow, plowPassive } = createCtx();
		const summary = describeContent('action', plow.id, ctx);
		const { effects, description } = splitSummary(summary);
		expect(description).toBeUndefined();
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modKey = (
			costMod?.params as { key?: keyof typeof SYNTHETIC_RESOURCES }
		)?.key as keyof typeof SYNTHETIC_RESOURCES;
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		const modIcon = SYNTHETIC_RESOURCES[modKey]?.icon ?? '';
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
		const hapInfo = SYNTHETIC_RESOURCES.happiness;
		expect(effects).toEqual([
			{
				title: `${expand.icon} ${expand.name}`,
				items: [
					`${SYNTHETIC_LAND_INFO.icon} ${
						landCount >= 0 ? '+' : ''
					}${landCount} ${SYNTHETIC_LAND_INFO.label}`,
					`${hapInfo.icon}${hapAmt >= 0 ? '+' : ''}${hapAmt} ${hapInfo.label}`,
				],
			},
			{
				title: `${till.icon} ${till.name}`,
				items: [
					`Till ${SYNTHETIC_LAND_INFO.icon} ${SYNTHETIC_LAND_INFO.label} to unlock ${SYNTHETIC_SLOT_INFO.icon} ${SYNTHETIC_SLOT_INFO.label}`,
				],
			},
			{
				title: `${passiveIcon ? `${passiveIcon} ` : ''}${passiveName} – Until your next ${
					upkeepDescriptionLabel
				}`,
				items: [
					`💲 Cost Modifier on all actions: Increase cost by ${modIcon}${modAmt}`,
				],
			},
		]);
	});
});
