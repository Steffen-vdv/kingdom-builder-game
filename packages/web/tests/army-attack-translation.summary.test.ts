import { describe, it, expect, vi } from 'vitest';
import type { SummaryEntry } from '../src/translation/content';
import { summarizeContent, describeContent } from '../src/translation/content';
import { Resource, Stat } from '@kingdom-builder/engine';
import { ResourceMethods } from '@kingdom-builder/contents/config/builderShared';
import type { EffectDef } from './helpers/armyAttackFactories';
import {
	createSyntheticCtx,
	createPartialStatCtx,
	SYNTH_ATTACK,
	SYNTH_COMBAT_STATS,
} from './helpers/armyAttackFactories';
import { selectResourceInfo, selectStatInfo } from '../src/translation/effects/formatters/attack/descriptorSelectors';
import { resolveAttackFormatterContext } from '../src/translation/effects/formatters/attack/statContext';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('army attack translation summary', () => {
	it('summarizes attack action with on-damage effects', () => {
		const { ctx: translationContext, attack, plunder } = createSyntheticCtx();
		const castle = selectResourceInfo(translationContext, Resource.castleHP);
		const happiness = selectResourceInfo(translationContext, Resource.happiness);
		const warWeariness = selectStatInfo(translationContext, Stat.warWeariness);
		const attackEffect = attack.effects.find(
			(effectDef: EffectDef) => effectDef.type === 'attack',
		);
		const attackFormatterContext = resolveAttackFormatterContext(
			attackEffect as EffectDef<Record<string, unknown>>,
			translationContext,
		);
		const powerDescriptor = attackFormatterContext.stats.power;
		const powerSummary =
			powerDescriptor?.icon ?? powerDescriptor?.label ?? 'Attack Power';
		const targetSummary = castle.icon || castle.label;
		const onDamage = (attackEffect?.params?.['onDamage'] ?? {}) as {
			attacker?: EffectDef[];
			defender?: EffectDef[];
		};
		const attackerRes = (onDamage.attacker ?? []).find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key === Resource.happiness,
		);
		const defenderRes = (onDamage.defender ?? []).find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key === Resource.happiness,
		);
		const attackerAmtRaw =
			(attackerRes?.params as { amount?: number })?.amount ?? 0;
		const defenderAmtRaw =
			(defenderRes?.params as { amount?: number })?.amount ?? 0;
		const attackerAmt =
			attackerRes?.method === ResourceMethods.REMOVE
				? -attackerAmtRaw
				: attackerAmtRaw;
		const defenderAmt =
			defenderRes?.method === ResourceMethods.REMOVE
				? -defenderAmtRaw
				: defenderAmtRaw;
		const warEffect = attack.effects.find(
			(effectDef: EffectDef) =>
				effectDef.type === 'stat' &&
				(effectDef.params as { key?: string }).key === Stat.warWeariness,
		);
		const warAmt = (warEffect?.params as { amount?: number })?.amount ?? 0;
		const summary = summarizeContent('action', attack.id, translationContext);
		expect(summary).toEqual([
			`${powerSummary}${targetSummary}`,
			{
				title: `${targetSummary}💥`,
				items: [
					`🛡️${happiness.icon}${defenderAmt}`,
					`⚔️${happiness.icon}${attackerAmt >= 0 ? '+' : ''}${attackerAmt}`,
					`⚔️${plunder.icon} ${plunder.name}`,
				],
			},
			`${warWeariness.icon ?? ''}${warAmt >= 0 ? '+' : ''}${warAmt}`,
		]);
	});

	it('describes plunder effects under on-damage entry', () => {
		const { ctx: translationContext, plunder } = createSyntheticCtx();
		const description = describeContent('action', SYNTH_ATTACK.id, translationContext);
		const onDamage = description.find(
			(entry) =>
				typeof entry === 'object' &&
				'title' in entry &&
				(entry as { title: string }).title.startsWith('On opponent'),
		) as { items: SummaryEntry[] };
		const plunderEntry = onDamage.items.find(
			(item) =>
				typeof item === 'object' &&
				(item as { title: string }).title === `${plunder.icon} ${plunder.name}`,
		) as { items?: unknown[] } | undefined;
		expect(plunderEntry).toBeDefined();
		expect(
			plunderEntry &&
			Array.isArray(plunderEntry.items) &&
			(plunderEntry.items?.length ?? 0) > 0,
		).toBeTruthy();
	});

	it('falls back to generic labels when combat stat descriptors are omitted', () => {
		const { ctx: translationContext, attack } = createPartialStatCtx();
		const attackEffect = attack.effects.find(
			(effectDef: EffectDef) => effectDef.type === 'attack',
		);
		const castle = selectResourceInfo(translationContext, Resource.castleHP);
		const targetDisplay = castle.icon ? `${castle.icon} ${castle.label}` : castle.label;
		const summary = summarizeContent('action', attack.id, translationContext);
		expect(summary).toEqual(['Attack Power' + (castle.icon || castle.label)]);
		const description = describeContent('action', attack.id, translationContext);
		expect(description).toEqual([
			{
				title: 'Attack opponent with your attack power',
				items: [
					'Damage reduction applied',
					'Apply damage to opponent defenses',
					`If opponent defenses fall, overflow remaining damage onto opponent ${targetDisplay}`,
				],
			},
		]);
	});

	it('summarizes building attack as destruction', () => {
		const { ctx: translationContext, buildingAttack } = createSyntheticCtx();
		const attackEffect = buildingAttack.effects.find(
			(effectDef: EffectDef) => effectDef.type === 'attack',
		);
		const attackContext = resolveAttackFormatterContext(
			attackEffect as EffectDef<Record<string, unknown>>,
			translationContext,
		);
		const powerDescriptor = attackContext.stats.power;
		const powerSummary =
			powerDescriptor?.icon ?? powerDescriptor?.label ?? 'Attack Power';
		const summaryTarget = buildingAttack.name || buildingAttack.id;
		const gold = selectResourceInfo(translationContext, Resource.gold);
		const attackEffectParams = attackEffect?.params as { onDamage?: { attacker?: EffectDef[] } };
		const rewardEffect = attackEffectParams?.onDamage?.attacker?.find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key === Resource.gold,
		);
		const rewardAmount = (rewardEffect?.params as { amount?: number })?.amount ?? 0;
		const summary = summarizeContent('action', buildingAttack.id, translationContext);
		expect(summary).toEqual([
			`${powerSummary}${summaryTarget}`,
			{
				title: `${summaryTarget}💥`,
				items: [`⚔️${gold.icon}+${rewardAmount}`],
			},
		]);
	});
});
