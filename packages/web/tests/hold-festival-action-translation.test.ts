import { describe, it, expect, vi } from 'vitest';
import {
	summarizeContent,
	describeContent,
	logContent,
} from '../src/translation/content';
import { MODIFIER_INFO } from '@kingdom-builder/contents';
import {
	createSyntheticFestivalScenario,
	getSyntheticFestivalDetails,
} from './fixtures/syntheticFestival';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const sign = (n: number) => (n >= 0 ? '+' : '');

describe('hold festival action translation', () => {
	it('summarizes hold festival action', () => {
		const { ctx, festivalActionId, attackActionId } =
			createSyntheticFestivalScenario();
		const summary = summarizeContent('action', festivalActionId, ctx);
		const details = getSyntheticFestivalDetails(
			ctx,
			festivalActionId,
			attackActionId,
		);
		const upkeepSummaryLabel = `${
			details.upkeepIcon ? `${details.upkeepIcon} ` : ''
		}${details.upkeepLabel}`;

		expect(summary).toEqual([
			`${details.happinessIcon}${sign(details.happinessAmt)}${details.happinessAmt}`,
			`${details.fortIcon}${sign(details.fortAmt)}${details.fortAmt}`,
			{
				title: `⏳ Until next ${upkeepSummaryLabel}`,
				items: [
					`${MODIFIER_INFO.result.icon}${details.armyAttack.icon}: ${details.happinessIcon}${sign(details.penaltyAmt)}${details.penaltyAmt}`,
				],
			},
		]);
	});

	it('describes hold festival action', () => {
		const { ctx, festivalActionId, attackActionId } =
			createSyntheticFestivalScenario();
		const desc = describeContent('action', festivalActionId, ctx);
		const details = getSyntheticFestivalDetails(
			ctx,
			festivalActionId,
			attackActionId,
		);
		const upkeepDescriptionLabel = `${
			details.upkeepIcon ? `${details.upkeepIcon} ` : ''
		}${details.upkeepLabel}`;

		expect(desc).toEqual([
			`${details.happinessInfo.icon}${sign(details.happinessAmt)}${details.happinessAmt} ${details.happinessInfo.label}`,
			`${details.fortAmt >= 0 ? 'Gain' : 'Lose'} ${Math.abs(details.fortAmt)} ${details.fortInfo.icon} ${details.fortInfo.label}`,
			{
				title: `${details.passiveIcon ? `${details.passiveIcon} ` : ''}${details.passiveName} – Until your next ${upkeepDescriptionLabel}`,
				items: [
					`${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${details.armyAttack.icon} ${details.armyAttack.name}: Whenever it resolves, ${details.happinessInfo.icon}${sign(details.penaltyAmt)}${details.penaltyAmt} ${details.happinessInfo.label}`,
				],
			},
		]);
	});

	it('logs hold festival action', () => {
		const { ctx, festivalActionId, attackActionId } =
			createSyntheticFestivalScenario();
		const log = logContent('action', festivalActionId, ctx);
		const details = getSyntheticFestivalDetails(
			ctx,
			festivalActionId,
			attackActionId,
		);
		const upkeepDescriptionLabel = `${
			details.upkeepIcon ? `${details.upkeepIcon} ` : ''
		}${details.upkeepLabel}`;
		expect(log).toEqual([
			`${details.festival.icon} ${details.festival.name}`,
			`  ${details.passiveIcon ? `${details.passiveIcon} ` : ''}${details.passiveName} added`,
			`    ${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${details.armyAttack.icon} ${details.armyAttack.name}: Whenever it resolves, ${details.happinessInfo.icon}${sign(details.penaltyAmt)}${details.penaltyAmt} ${details.happinessInfo.label}`,
			`    ${details.passiveIcon ? `${details.passiveIcon} ` : ''}${details.passiveName} duration: Until player's next ${upkeepDescriptionLabel}`,
		]);
	});
});
