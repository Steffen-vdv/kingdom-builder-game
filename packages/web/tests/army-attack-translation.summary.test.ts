import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';

import type { SummaryEntry } from '../src/translation/content';
import { summarizeContent, describeContent } from '../src/translation/content';
import { Resource, Stat } from '@kingdom-builder/engine';
import type { EffectDef } from './helpers/armyAttackFactories';
import {
	createSyntheticCtx,
	createPartialStatCtx,
	setupStatOverrides,
	teardownStatOverrides,
	getStat,
	iconLabel,
	SYNTH_ATTACK,
	SYNTH_COMBAT_STATS,
	suppressSyntheticStatDescriptor,
	restoreSyntheticStatDescriptor,
} from './helpers/armyAttackFactories';
import {
	SYNTH_RESOURCE_IDS,
	SYNTH_STAT_IDS,
	COMBAT_STAT_CONFIG,
} from './helpers/armyAttackConfig';
import {
	selectAttackBuildingDescriptor,
	selectAttackResourceDescriptor,
	selectAttackStatDescriptor,
	withAttackTranslationContext,
} from '../src/translation/effects/formatters/attack/registrySelectors';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

beforeAll(() => {
	setupStatOverrides();
});

afterAll(() => {
	teardownStatOverrides();
});

describe('army attack translation summary', () => {
	it('summarizes attack action with on-damage effects', () => {
		const { translation, attack, plunder } = createSyntheticCtx();
		const castle = withAttackTranslationContext(translation, () =>
			selectAttackResourceDescriptor(Resource.castleHP),
		);
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
		const happiness = withAttackTranslationContext(translation, () =>
			selectAttackResourceDescriptor(Resource.happiness),
		);
		const warWeariness = withAttackTranslationContext(translation, () =>
			selectAttackStatDescriptor(Stat.warWeariness),
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
					SYNTH_RESOURCE_IDS.happiness,
		);
		const defenderRes = (onDamage.defender ?? []).find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key ===
					SYNTH_RESOURCE_IDS.happiness,
		);
		const attackerAmtRaw =
			(attackerRes?.params as { amount?: number })?.amount ?? 0;
		const defenderAmtRaw =
			(defenderRes?.params as { amount?: number })?.amount ?? 0;
		const attackerAmt =
			attackerRes?.method === 'remove' ? -attackerAmtRaw : attackerAmtRaw;
		const defenderAmt =
			defenderRes?.method === 'remove' ? -defenderAmtRaw : defenderAmtRaw;
		const warEffect = attack.effects.find(
			(effectDef: EffectDef) =>
				effectDef.type === 'stat' &&
				(effectDef.params as { key?: string }).key ===
					SYNTH_STAT_IDS.warWeariness,
		);
		const warAmt = (warEffect?.params as { amount?: number })?.amount ?? 0;
		const summary = summarizeContent('action', attack.id, translation);
		const targetSummary = castle.icon || castle.label;
		const powerIcon = powerStat.icon || COMBAT_STAT_CONFIG.power.icon;
		const summaryPrefix = `${powerIcon}${targetSummary}`;
		const attackerSign = attackerAmt >= 0 ? '+' : '';
		const defenderChange = `🛡️${happiness.icon}${defenderAmt}`;
		const attackerChange = `⚔️${happiness.icon}${attackerSign}${attackerAmt}`;
		const warChange = `${warWeariness.icon}${warAmt >= 0 ? '+' : ''}${warAmt}`;
		expect(summary).toEqual([
			summaryPrefix,
			{
				title: `${targetSummary}💥`,
				items: [
					defenderChange,
					attackerChange,
					`⚔️${plunder.icon} ${plunder.name}`,
				],
			},
			warChange,
		]);
	});

	it('describes plunder effects under on-damage entry', () => {
		const { ctx: engineContext, plunder } = createSyntheticCtx();
		const description = describeContent(
			'action',
			SYNTH_ATTACK.id,
			engineContext,
		);
		const onDamage = description.find(
			(entry) =>
				typeof entry === 'object' &&
				'title' in entry &&
				entry.title.startsWith('On opponent'),
		) as { items: SummaryEntry[] };
		const plunderTitle = `${plunder.icon} ${plunder.name}`;
		const plunderEntry = onDamage.items.find(
			(item) =>
				typeof item === 'object' &&
				(item as { title: string }).title === plunderTitle,
		) as { items?: unknown[] } | undefined;
		expect(plunderEntry).toBeDefined();
		expect(
			plunderEntry &&
				Array.isArray(plunderEntry.items) &&
				(plunderEntry.items?.length ?? 0) > 0,
		).toBeTruthy();
	});

	it('falls back to generic labels when combat stat descriptors are omitted', () => {
		const { translation, attack, resourceMetadata } = createPartialStatCtx();
		const originalResource = resourceMetadata[SYNTH_RESOURCE_IDS.castleHP];
		delete resourceMetadata[SYNTH_RESOURCE_IDS.castleHP];
		suppressSyntheticStatDescriptor(SYNTH_COMBAT_STATS.power.key);
		try {
			const castle = withAttackTranslationContext(translation, () =>
				selectAttackResourceDescriptor(Resource.castleHP),
			);
			const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
			expect(powerStat.label).toBe('Valor');
			const targetDisplay = iconLabel(
				castle.icon,
				castle.label,
				Resource.castleHP,
			);

			const summary = summarizeContent('action', attack.id, translation);
			const targetSummary = castle.icon || castle.label;
			expect(summary).toEqual([
				`${COMBAT_STAT_CONFIG.power.icon}${targetSummary}`,
			]);

			const description = describeContent('action', attack.id, translation);
			const defaultAttack = iconLabel(
				COMBAT_STAT_CONFIG.power.icon,
				COMBAT_STAT_CONFIG.power.label,
				'attack power',
			);
			const overflowDescription =
				'If opponent defenses fall, overflow remaining damage ' +
				`onto opponent ${targetDisplay}`;
			expect(description).toEqual([
				{
					title: `Attack opponent with your ${defaultAttack}`,
					items: [
						'Damage reduction applied',
						'Apply damage to opponent defenses',
						overflowDescription,
					],
				},
			]);
		} finally {
			if (originalResource) {
				resourceMetadata[SYNTH_RESOURCE_IDS.castleHP] = originalResource;
			}
			restoreSyntheticStatDescriptor(SYNTH_COMBAT_STATS.power.key);
		}
	});

	it('summarizes building attack as destruction', () => {
		const { translation, buildingAttack, building } = createSyntheticCtx();
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
		const gold = withAttackTranslationContext(translation, () =>
			selectAttackResourceDescriptor(Resource.gold),
		);
		const buildingDescriptor = withAttackTranslationContext(translation, () =>
			selectAttackBuildingDescriptor(building.id),
		);
		const summaryTarget =
			buildingDescriptor.icon || buildingDescriptor.label || building.id;
		const attackEffect = buildingAttack.effects.find(
			(effectDef: EffectDef) => effectDef.type === 'attack',
		);
		const onDamage = (attackEffect?.params?.['onDamage'] ?? {}) as {
			attacker?: EffectDef[];
		};
		const rewardEffect = (onDamage.attacker ?? []).find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { key?: string }).key === SYNTH_RESOURCE_IDS.gold,
		);
		const rewardAmount =
			(rewardEffect?.params as { amount?: number })?.amount ?? 0;

		const summary = summarizeContent('action', buildingAttack.id, translation);
		const powerIcon = powerStat.icon || COMBAT_STAT_CONFIG.power.icon;
		const summaryPrefix = `${powerIcon}${summaryTarget}`;
		expect(summary).toEqual([
			summaryPrefix,
			{
				title: `${summaryTarget}💥`,
				items: [`⚔️${gold.icon}+${rewardAmount}`],
			},
		]);
	});
});
