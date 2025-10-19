import { describe, it, expect } from 'vitest';
import {
	summarizeContent,
	describeContent,
	logContent,
} from '../src/translation/content';
import { formatTargetLabel } from '../src/translation/effects/formatters/modifier_helpers';
import {
	createSyntheticFestivalScenario,
	getSyntheticFestivalDetails,
} from './fixtures/syntheticFestival';

const sign = (n: number) => (n >= 0 ? '+' : '');

describe('hold festival action translation', () => {
	it('summarizes hold festival action', () => {
		const scenario = createSyntheticFestivalScenario();
		const { translation, festivalActionId } = scenario;
		const summary = summarizeContent('action', festivalActionId, translation);
		const details = getSyntheticFestivalDetails(scenario);
		const upkeepSummaryLabel = `${
			details.upkeepIcon ? `${details.upkeepIcon} ` : ''
		}${details.upkeepLabel}`;
		const fortSummarySubject = details.fortIcon || details.fortInfo.label;

		expect(summary).toEqual([
			`${details.happinessIcon}${sign(details.happinessAmt)}${details.happinessAmt}`,
			`${fortSummarySubject} ${sign(details.fortAmt)}${details.fortAmt}`,
			{
				title: `⏳ Until next ${upkeepSummaryLabel}`,
				items: [
					`${details.modifierInfo.icon ?? ''}${details.armyAttack.icon}: ${details.happinessIcon}${sign(details.penaltyAmt)}${details.penaltyAmt}`,
				],
			},
		]);
	});

	it('describes hold festival action', () => {
		const scenario = createSyntheticFestivalScenario();
		const { translation, festivalActionId } = scenario;
		const description = describeContent(
			'action',
			festivalActionId,
			translation,
		);
		const details = getSyntheticFestivalDetails(scenario);
		const upkeepDescriptionLabel = `${
			details.upkeepIcon ? `${details.upkeepIcon} ` : ''
		}${details.upkeepLabel}`;

		expect(description).toEqual([
			`${details.happinessInfo.icon}${sign(details.happinessAmt)}${details.happinessAmt} ${details.happinessInfo.label}`,
			`${details.fortInfo.icon || details.fortInfo.label} ${sign(details.fortAmt)}${details.fortAmt} ${details.fortInfo.label}`,
			{
				title: `${details.passiveIcon ? `${details.passiveIcon} ` : ''}${details.passiveName} – Until your next ${upkeepDescriptionLabel}`,
				items: [
					`${details.modifierInfo.icon ?? ''} ${details.modifierInfo.label ?? 'Outcome Adjustment'} on ${details.armyAttack.icon} ${details.armyAttack.name}: Whenever it resolves, ${details.happinessInfo.icon}${sign(details.penaltyAmt)}${details.penaltyAmt} ${details.happinessInfo.label}`,
				],
			},
		]);
	});

	it('logs hold festival action', () => {
		const scenario = createSyntheticFestivalScenario();
		const { translation, festivalActionId } = scenario;
		const log = logContent('action', festivalActionId, translation);
		const details = getSyntheticFestivalDetails(scenario);
		const passiveAssetIcon = translation.assets.passive.icon?.trim() ?? '';
		const passiveLabel = [
			details.passiveIcon?.trim() ?? '',
			details.passiveName?.trim() ?? '',
		]
			.filter((part) => part.length > 0)
			.join(' ');
		const passiveActivationLabel = [passiveAssetIcon, passiveLabel]
			.filter((part) => part.length > 0)
			.join(' ')
			.trim();
		const upkeepDescriptionLabel = `${
			details.upkeepIcon ? `${details.upkeepIcon} ` : ''
		}${details.upkeepLabel}`;
		const modifierIcon = details.modifierInfo.icon
			? `${details.modifierInfo.icon} `
			: '';
		const modifierLabel = details.modifierInfo.label ?? 'Outcome Adjustment';
		const raidLabel = formatTargetLabel(
			details.armyAttack.icon ?? '',
			details.armyAttack.name,
		);
		const happinessLabel =
			`${details.happinessInfo.icon}${sign(details.penaltyAmt)}${details.penaltyAmt} ${details.happinessInfo.label}`.replace(
				/\s{2,}/gu,
				' ',
			);
		expect(log).toEqual([
			{
				text: `${details.festival.icon} ${details.festival.name}`,
				depth: 0,
				kind: 'headline',
			},
			{
				text: `${passiveActivationLabel} activated`,
				depth: 1,
				kind: 'group',
			},
			{
				text: `${modifierIcon}${modifierLabel} on ${raidLabel}: Whenever it resolves, ${happinessLabel}`,
				depth: 2,
				kind: 'effect',
			},
			{
				text: `${details.passiveIcon ? `${details.passiveIcon} ` : ''}Duration: Until player's next ${upkeepDescriptionLabel}`,
				depth: 2,
				kind: 'effect',
			},
		]);
	});
});
