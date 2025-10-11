import { describe, it, expect, vi } from 'vitest';
import type { SummaryEntry } from '../src/translation/content';
import { summarizeContent, describeContent } from '../src/translation/content';
import { Resource as ContentResource, Stat as ContentStat } from '@kingdom-builder/contents';
import { Resource, Stat } from '@kingdom-builder/engine';
import { ResourceMethods } from '@kingdom-builder/contents/config/builderShared';
import type { EffectDef } from './helpers/armyAttackFactories';
import {
        createSyntheticCtx,
        createPartialStatCtx,
        SYNTH_ATTACK,
        SYNTH_COMBAT_STATS,
} from './helpers/armyAttackFactories';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';
import {
        selectResourceIconLabel,
        selectStatIconLabel,
} from '../src/translation/registrySelectors';
import { DEFAULT_ATTACK_STAT_LABELS } from '../src/translation/effects/formatters/attack/types';

vi.mock('@kingdom-builder/engine', async () => {
        return await import('../../engine/src');
});

const iconLabel = (
        icon: string | undefined,
        label: string | undefined,
        fallback: string,
) => {
        const resolved = label ?? fallback;
        return icon ? `${icon} ${resolved}` : resolved;
};

describe('army attack translation summary', () => {
        it('summarizes attack action with on-damage effects', () => {
                const { ctx: engineContext, attack, plunder } = createSyntheticCtx();
                const translationContext = createTranslationContextForEngine(
                        engineContext,
                );
                const castle = selectResourceIconLabel(
                        translationContext,
                        Resource.castleHP,
                );
                const powerStat = selectStatIconLabel(
                        translationContext,
                        SYNTH_COMBAT_STATS.power.key,
                        { fallbackLabel: DEFAULT_ATTACK_STAT_LABELS.power },
                );
                const happiness = selectResourceIconLabel(
                        translationContext,
                        Resource.happiness,
                );
                const warWeariness = selectStatIconLabel(
                        translationContext,
                        Stat.warWeariness,
                        { fallbackLabel: 'War Weariness' },
                );
                const attackEffect = attack.effects.find(
                        (effectDef: EffectDef) => effectDef.type === 'attack',
                );
		const onDamage = (attackEffect?.params?.['onDamage'] ?? {}) as {
			attacker?: EffectDef[];
			defender?: EffectDef[];
		};
		const attackerRes = (onDamage.attacker ?? []).find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key ===
					ContentResource.happiness,
		);
		const defenderRes = (onDamage.defender ?? []).find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key ===
					ContentResource.happiness,
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
                                (effectDef.params as { key?: string }).key === ContentStat.warWeariness,
                );
                const warAmt = (warEffect?.params as { amount?: number })?.amount ?? 0;
                const summary = summarizeContent(
                        'action',
                        attack.id,
                        translationContext,
                );
                const powerSummary = powerStat.icon ?? powerStat.label ?? 'Attack Power';
                const targetSummary = castle.icon || castle.label;
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
                        `${warWeariness.icon}${warAmt >= 0 ? '+' : ''}${warAmt}`,
                ]);
        });

        it('describes plunder effects under on-damage entry', () => {
                const { ctx: engineContext, plunder } = createSyntheticCtx();
                const translationContext = createTranslationContextForEngine(
                        engineContext,
                );
                const description = describeContent(
                        'action',
                        SYNTH_ATTACK.id,
                        translationContext,
                );
                const onDamage = description.find(
                        (entry) =>
                                typeof entry === 'object' &&
				'title' in entry &&
				entry.title.startsWith('On opponent'),
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
                const { ctx: engineContext, attack } = createPartialStatCtx();
                const translationContext = createTranslationContextForEngine(
                        engineContext,
                );
                const castle = selectResourceIconLabel(
                        translationContext,
                        Resource.castleHP,
                );
                const powerStat = selectStatIconLabel(
                        translationContext,
                        SYNTH_COMBAT_STATS.power.key,
                        { fallbackLabel: DEFAULT_ATTACK_STAT_LABELS.power },
                );
                const targetDisplay = iconLabel(
                        castle.icon,
                        castle.label,
                        Resource.castleHP,
                );

                const summary = summarizeContent(
                        'action',
                        attack.id,
                        translationContext,
                );
                const powerSummary = powerStat.icon ?? powerStat.label ?? 'Attack Power';
                const targetSummary = castle.icon || castle.label;
                expect(summary).toEqual([`${powerSummary}${targetSummary}`]);

                const description = describeContent(
                        'action',
                        attack.id,
                        translationContext,
                );
                expect(description).toEqual([
                        {
                                title: `Attack opponent with your ${iconLabel(
                                        powerStat.icon,
                                        powerStat.label,
                                        'attack power',
                                )}`,
                                items: [
                                        'Damage reduction applied',
                                        'Apply damage to opponent defenses',
					`If opponent defenses fall, overflow remaining damage onto opponent ${targetDisplay}`,
				],
			},
		]);
	});

        it('summarizes building attack as destruction', () => {
                const {
                        ctx: engineContext,
                        buildingAttack,
                        building,
                } = createSyntheticCtx();
                const translationContext = createTranslationContextForEngine(
                        engineContext,
                );
                const powerStat = selectStatIconLabel(
                        translationContext,
                        SYNTH_COMBAT_STATS.power.key,
                        { fallbackLabel: DEFAULT_ATTACK_STAT_LABELS.power },
                );
                const gold = selectResourceIconLabel(translationContext, Resource.gold);
                const summaryTarget = building.icon || building.name || building.id;
                const attackEffect = buildingAttack.effects.find(
                        (effectDef: EffectDef) => effectDef.type === 'attack',
                );
                const onDamage = (attackEffect?.params?.['onDamage'] ?? {}) as {
			attacker?: EffectDef[];
		};
		const rewardEffect = (onDamage.attacker ?? []).find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key === ContentResource.gold,
		);
		const rewardAmount =
			(rewardEffect?.params as { amount?: number })?.amount ?? 0;

                const summary = summarizeContent(
                        'action',
                        buildingAttack.id,
                        translationContext,
                );
                const powerSummary = powerStat.icon ?? powerStat.label ?? 'Attack Power';
                expect(summary).toEqual([
                        `${powerSummary}${summaryTarget}`,
                        {
				title: `${summaryTarget}💥`,
				items: [`⚔️${gold.icon}+${rewardAmount}`],
			},
		]);
	});
});
