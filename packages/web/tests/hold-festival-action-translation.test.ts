import { describe, it, expect, vi } from 'vitest';
import {
	summarizeContent,
	describeContent,
	logContent,
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
	STATS,
	Resource,
	PASSIVE_INFO,
	MODIFIER_INFO,
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

const sign = (n: number) => (n >= 0 ? '+' : '');

describe('hold festival action translation', () => {
	it('summarizes hold festival action', () => {
		const ctx = createCtx();
		const summary = summarizeContent('action', 'hold_festival', ctx);
		const holdFestival = ctx.actions.get('hold_festival');
		const happinessEff = holdFestival.effects.find(
			(e: EffectDef) => e.type === 'resource',
		) as EffectDef<{ key: string; amount: number }>;
		const happinessIcon =
			RESOURCES[happinessEff.params.key as keyof typeof RESOURCES].icon;
		const happinessAmt = happinessEff.params.amount;
		const fortEff = holdFestival.effects.find(
			(e: EffectDef) => e.type === 'stat',
		) as EffectDef<{ key: string; amount: number }>;
		const fortIcon = STATS[fortEff.params.key as keyof typeof STATS].icon;
		const fortAmt =
			fortEff.method === 'remove'
				? -fortEff.params.amount
				: (fortEff.params.amount as number);
		const passive = holdFestival.effects.find(
			(e: EffectDef) => e.type === 'passive',
		) as EffectDef;
		const resMod = passive.effects?.find(
			(e: EffectDef) => e.type === 'result_mod',
		) as EffectDef;
		const innerRes = resMod.effects?.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === Resource.happiness,
		) as EffectDef<{ amount: number }>;
		const penaltyAmt =
			innerRes.method === 'remove'
				? -(innerRes.params.amount as number)
				: (innerRes.params.amount as number);
		const armyAttack = ctx.actions.get('army_attack');
		const upkeepLabel =
			PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';

		expect(summary).toEqual([
			`${happinessIcon}${sign(happinessAmt)}${happinessAmt}`,
			`${fortIcon}${sign(fortAmt)}${fortAmt}`,
			{
				title: `⏳ Until next ${upkeepLabel}`,
				items: [
					`${MODIFIER_INFO.result.icon}${armyAttack.icon}: ${happinessIcon}${sign(penaltyAmt)}${penaltyAmt}`,
				],
			},
		]);
	});

	it('describes hold festival action', () => {
		const ctx = createCtx();
		const desc = describeContent('action', 'hold_festival', ctx);
		const holdFestival = ctx.actions.get('hold_festival');
		const happinessEff = holdFestival.effects.find(
			(e: EffectDef) => e.type === 'resource',
		) as EffectDef<{ key: string; amount: number }>;
		const happinessInfo =
			RESOURCES[happinessEff.params.key as keyof typeof RESOURCES];
		const happinessAmt = happinessEff.params.amount;
		const fortEff = holdFestival.effects.find(
			(e: EffectDef) => e.type === 'stat',
		) as EffectDef<{ key: string; amount: number }>;
		const fortInfo = STATS[fortEff.params.key as keyof typeof STATS];
		const fortAmt =
			fortEff.method === 'remove'
				? -fortEff.params.amount
				: (fortEff.params.amount as number);
		const passive = holdFestival.effects.find(
			(e: EffectDef) => e.type === 'passive',
		) as EffectDef;
		const passiveMeta = passive.params as
			| { name?: string; icon?: string }
			| undefined;
		const passiveName = passiveMeta?.name ?? PASSIVE_INFO.label;
		const passiveIcon = passiveMeta?.icon ?? PASSIVE_INFO.icon;
		const resMod = passive.effects?.find(
			(e: EffectDef) => e.type === 'result_mod',
		) as EffectDef;
		const innerRes = resMod.effects?.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === Resource.happiness,
		) as EffectDef<{ amount: number }>;
		const penaltyAmt =
			innerRes.method === 'remove'
				? -(innerRes.params.amount as number)
				: (innerRes.params.amount as number);
		const armyAttack = ctx.actions.get('army_attack');
		const upkeepLabel =
			PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';

		expect(desc).toEqual([
			`${happinessInfo.icon}${sign(happinessAmt)}${happinessAmt} ${happinessInfo.label}`,
			`${fortAmt >= 0 ? 'Gain' : 'Lose'} ${Math.abs(fortAmt)} ${fortInfo.icon} ${fortInfo.label}`,
			{
				title: `${passiveIcon ? `${passiveIcon} ` : ''}${passiveName} – Until your next ${upkeepLabel} Phase`,
				items: [
					`${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${armyAttack.icon} ${armyAttack.name}: Whenever it resolves, ${happinessInfo.icon}${sign(penaltyAmt)}${penaltyAmt} ${happinessInfo.label}`,
				],
			},
		]);
	});

	it('logs hold festival action', () => {
		const ctx = createCtx();
		const log = logContent('action', 'hold_festival', ctx);
		const holdFestival = ctx.actions.get('hold_festival');
		const armyAttack = ctx.actions.get('army_attack');
		const passive = holdFestival.effects.find(
			(e: EffectDef) => e.type === 'passive',
		) as EffectDef;
		const passiveMeta = passive.params as
			| { name?: string; icon?: string }
			| undefined;
		const passiveName = passiveMeta?.name ?? PASSIVE_INFO.label;
		const passiveIcon = passiveMeta?.icon ?? PASSIVE_INFO.icon;
		const resMod = passive.effects?.find(
			(e: EffectDef) => e.type === 'result_mod',
		) as EffectDef;
		const innerRes = resMod.effects?.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === Resource.happiness,
		) as EffectDef<{ amount: number }>;
		const happinessInfo = RESOURCES[Resource.happiness];
		const penaltyAmt =
			innerRes.method === 'remove'
				? -(innerRes.params.amount as number)
				: (innerRes.params.amount as number);
		const upkeepLabel =
			PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';

		expect(log).toEqual([
			`Played ${holdFestival.icon} ${holdFestival.name}`,
			`  ${passiveIcon ? `${passiveIcon} ` : ''}${passiveName} added`,
			`    ${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${armyAttack.icon} ${armyAttack.name}: Whenever it resolves, ${happinessInfo.icon}${sign(penaltyAmt)}${penaltyAmt} ${happinessInfo.label}`,
			`    ${passiveIcon ? `${passiveIcon} ` : ''}${passiveName} duration: Until player's next ${upkeepLabel} Phase`,
		]);
	});
});
