import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';

import type { SummaryEntry } from '../src/translation/content';
import { summarizeContent, describeContent } from '../src/translation/content';
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
} from '../src/translation/effects/formatters/attack/registrySelectors';
import { buildBaseEntry } from '../src/translation/effects/formatters/attackFormatterUtils';

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
	const summaryToken = (
		icon: string | undefined,
		label: string | undefined,
		fallback: string,
	): string => {
		const trimmedIcon = icon?.trim();
		if (trimmedIcon) {
			return trimmedIcon;
		}
		const trimmedLabel = label?.trim();
		if (trimmedLabel) {
			return trimmedLabel;
		}
		return fallback;
	};

	it('summarizes attack action with on-damage effects', () => {
		const { translation, attack, plunder } = createSyntheticCtx();
		const castle = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.castleHP,
		);
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
		const happiness = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.happiness,
		);
		const warWeariness = selectAttackStatDescriptor(
			translation,
			SYNTH_STAT_IDS.warWeariness,
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
		const powerSummary = summaryToken(
			powerStat.icon,
			powerStat.label,
			COMBAT_STAT_CONFIG.power.icon,
		);
		const targetSummary = summaryToken(
			castle.icon,
			castle.label,
			SYNTH_RESOURCE_IDS.castleHP,
		);
		const expectedBaseEntry = attackEffect
			? buildBaseEntry(attackEffect, translation, 'summarize').entry
			: `${powerSummary}${targetSummary}`;
		expect(summary).toEqual([
			expectedBaseEntry,
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
		const { translation, attack, resourceMetadata } = createPartialStatCtx();
		const originalResource = resourceMetadata[SYNTH_RESOURCE_IDS.castleHP];
		delete resourceMetadata[SYNTH_RESOURCE_IDS.castleHP];
		suppressSyntheticStatDescriptor(SYNTH_COMBAT_STATS.power.key);
		try {
			const castle = selectAttackResourceDescriptor(
				translation,
				SYNTH_RESOURCE_IDS.castleHP,
			);
			const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
			expect(powerStat.label).toBe(SYNTH_COMBAT_STATS.power.key);
			const targetDisplay = iconLabel(
				castle.icon,
				castle.label,
				SYNTH_RESOURCE_IDS.castleHP,
			);

			const summary = summarizeContent('action', attack.id, translation);
			const targetSummary = castle.icon || castle.label;
			expect(summary).toEqual([
				`${COMBAT_STAT_CONFIG.power.icon}${targetSummary}`,
			]);

			const description = describeContent('action', attack.id, translation);
			expect(description).toEqual([
				{
					title: `Attack opponent with your ${iconLabel(
						COMBAT_STAT_CONFIG.power.icon,
						COMBAT_STAT_CONFIG.power.label,
						'attack power',
					)}`,
					items: [
						'Damage reduction applied',
						'Apply damage to opponent defenses',
						`If opponent defenses fall, overflow remaining damage onto opponent ${targetDisplay}`,
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
		const gold = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.gold,
		);
		const buildingDescriptor = selectAttackBuildingDescriptor(
			translation,
			building.id,
		);
		const summaryTarget = summaryToken(
			buildingDescriptor.icon,
			buildingDescriptor.label,
			building.id,
		);
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
		const powerSummary = summaryToken(
			powerStat.icon,
			powerStat.label,
			COMBAT_STAT_CONFIG.power.icon,
		);
		const expectedBaseEntry = attackEffect
			? buildBaseEntry(attackEffect, translation, 'summarize').entry
			: `${powerSummary}${summaryTarget}`;
		expect(summary).toEqual([
			expectedBaseEntry,
			{
				title: `${summaryTarget}💥`,
				items: [`⚔️${gold.icon}+${rewardAmount}`],
			},
		]);
	});
});
