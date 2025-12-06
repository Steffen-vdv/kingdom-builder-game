import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';

import type { SummaryEntry } from '../src/translation/content';
import { summarizeContent, describeContent } from '../src/translation/content';
import type { EffectDef } from './helpers/armyAttackFactories';
import {
	createSyntheticEngineContext,
	createPartialStatEngineContext,
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
	SYNTH_RESOURCE_METADATA,
	COMBAT_STAT_CONFIG,
} from './helpers/armyAttackConfig';
import {
	selectAttackBuildingDescriptor,
	selectAttackResourceDescriptor,
	selectAttackStatDescriptor,
} from '../src/translation/effects/formatters/attack/registrySelectors';
import { humanizeIdentifier } from '../src/translation/effects/stringUtils';

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
		const { translation, attack, plunder } = createSyntheticEngineContext();
		const castle = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.castleHP,
		);
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
		const warWeariness = selectAttackStatDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.warWeariness,
		);
		// V2 format: stats are now resources with resourceId
		const warEffect = attack.effects.find(
			(effectDef: EffectDef) =>
				effectDef.type === 'resource' &&
				(effectDef.params as { resourceId?: string }).resourceId ===
					SYNTH_RESOURCE_IDS.warWeariness,
		);
		// V2 format: amount is in change.amount
		const warChange = (warEffect?.params as { change?: { amount?: number } })
			?.change;
		const warAmt = warChange?.amount ?? 0;
		const summary = summarizeContent('action', attack.id, translation);
		const powerSummary = powerStat.icon ?? powerStat.label ?? 'Attack Power';
		const targetSummary = castle.icon || castle.label;
		const warSubject =
			warWeariness.icon ||
			warWeariness.label ||
			SYNTH_RESOURCE_IDS.warWeariness;
		const warChangeStr = `${warAmt >= 0 ? '+' : '-'}${Math.abs(warAmt)}`;
		expect(summary[0]).toBe(`${powerSummary}${targetSummary}`);
		const damageSummary = summary[1];
		if (typeof damageSummary !== 'object' || damageSummary === null) {
			throw new Error('Expected structured on-damage summary entry.');
		}
		expect(damageSummary).toMatchObject({ title: `${targetSummary}💥` });
		const damageItems =
			(damageSummary as { items?: SummaryEntry[] }).items ?? [];
		const plunderLine = damageItems.find(
			(item) => typeof item === 'string' && item.includes(plunder.name),
		);
		expect(plunderLine).toBe(`⚔️${plunder.icon} ${plunder.name}`);
		expect(summary[2]).toBe(`${warSubject} ${warChangeStr}`);
	});

	it('describes plunder effects under on-damage entry', () => {
		const { translation, plunder } = createSyntheticEngineContext();
		const description = describeContent('action', SYNTH_ATTACK.id, translation);
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
		const originalResource =
			SYNTH_RESOURCE_METADATA[SYNTH_RESOURCE_IDS.castleHP];
		delete SYNTH_RESOURCE_METADATA[SYNTH_RESOURCE_IDS.castleHP];
		suppressSyntheticStatDescriptor(SYNTH_COMBAT_STATS.power.key);
		try {
			const { translation, attack } = createPartialStatEngineContext();
			const castle = selectAttackResourceDescriptor(
				translation,
				SYNTH_RESOURCE_IDS.castleHP,
			);
			const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
			const fallbackLabel =
				humanizeIdentifier(SYNTH_COMBAT_STATS.power.key) ||
				SYNTH_COMBAT_STATS.power.key;
			expect(powerStat.label).toBe(fallbackLabel);
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
				SYNTH_RESOURCE_METADATA[SYNTH_RESOURCE_IDS.castleHP] = originalResource;
			}
			restoreSyntheticStatDescriptor(SYNTH_COMBAT_STATS.power.key);
		}
	});

	it('summarizes building attack as destruction', () => {
		const { translation, buildingAttack, building } =
			createSyntheticEngineContext();
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
		const gold = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.gold,
		);
		const buildingDescriptor = selectAttackBuildingDescriptor(
			translation,
			building.id,
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
				((effectDef.params as { key?: string }).key ===
					SYNTH_RESOURCE_IDS.gold ||
					(effectDef.params as { resourceId?: string }).resourceId ===
						SYNTH_RESOURCE_IDS.gold),
		);
		// Support both legacy (amount) and V2 (change.amount) formats
		const changeObj = (rewardEffect?.params as { change?: { amount?: number } })
			?.change;
		const legacyAmount = (rewardEffect?.params as { amount?: number })?.amount;
		const rewardAmount = changeObj?.amount ?? legacyAmount ?? 0;

		const summary = summarizeContent('action', buildingAttack.id, translation);
		const powerSummary = powerStat.icon ?? powerStat.label ?? 'Attack Power';
		// V2 format adds space after icon for readability
		expect(summary).toEqual([
			`${powerSummary}${summaryTarget}`,
			{
				title: `${summaryTarget}💥`,
				items: [`⚔️${gold.icon} +${rewardAmount}`],
			},
		]);
	});
});
