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
import { formatActionTitle } from '../src/translation/formatActionTitle';

const sign = (n: number) => (n >= 0 ? '+' : '');

describe('hold festival action translation', () => {
	it('summarizes hold festival action', () => {
		const scenario = createSyntheticFestivalScenario();
		const { translation, festivalActionId } = scenario;
		const summary = summarizeContent('action', festivalActionId, translation);
		const details = getSyntheticFestivalDetails(scenario);
		const modifierIcon = details.modifierInfo.icon ?? '✨';
		const fortSummarySubject = details.fortIcon || details.fortInfo.label;

		// Passive effects split into two entries:
		// 1. "+♾️: <icon> <name>" with child effects
		// 2. "On your <phase icon> <Phase> Phase" with removal "-♾️: <icon> <name>"
		expect(summary).toEqual([
			`${details.happinessIcon} ${sign(details.happinessAmt)}${details.happinessAmt}`,
			`${fortSummarySubject} ${sign(details.fortAmt)}${details.fortAmt}`,
			{
				title: `+♾️: ${details.passiveIcon} ${details.passiveName}`,
				items: [
					`${modifierIcon}${details.raid.icon}: ${details.happinessIcon} ${sign(details.penaltyAmt)}${details.penaltyAmt}`,
				],
			},
			{
				title: `On your ${details.upkeepIcon} ${details.upkeepLabel} Phase`,
				items: [`-♾️: ${details.passiveIcon} ${details.passiveName}`],
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
		const modifierIcon = details.modifierInfo.icon ?? '✨';

		// Passive effects split into two entries:
		// 1. "Gain ♾️ Passive: <icon> <name>" with child effects
		// 2. "On your <phase icon> <Phase> Phase" with "Remove ♾️ Passive: ..."
		expect(description).toEqual([
			`${details.happinessInfo.icon} ${sign(details.happinessAmt)}${details.happinessAmt} ${details.happinessInfo.label}`,
			`${details.fortInfo.icon || details.fortInfo.label} ${sign(details.fortAmt)}${details.fortAmt} ${details.fortInfo.label}`,
			{
				title: `Gain ♾️ Passive: ${details.passiveIcon} ${details.passiveName}`,
				items: [
					`${modifierIcon} Modifier on ${details.raid.icon} ${details.raid.name}: Whenever it resolves, ${details.happinessInfo.icon} ${sign(details.penaltyAmt)}${details.penaltyAmt} ${details.happinessInfo.label}`,
				],
			},
			{
				title: `On your ${details.upkeepIcon} ${details.upkeepLabel} Phase`,
				items: [
					`Remove ♾️ Passive: ${details.passiveIcon} ${details.passiveName}`,
				],
			},
		]);
	});

	it('logs hold festival action', () => {
		const scenario = createSyntheticFestivalScenario();
		const { translation, festivalActionId } = scenario;
		const log = logContent('action', festivalActionId, translation);
		const details = getSyntheticFestivalDetails(scenario);
		const definition = translation.actions.get(festivalActionId);
		if (!definition) {
			throw new Error('Missing hold festival action definition');
		}
		const actionHeadline = formatActionTitle(definition, translation);
		const upkeepDescriptionLabel = `${
			details.upkeepIcon ? `${details.upkeepIcon} ` : ''
		}${details.upkeepLabel}`;
		const modifierIconValue = details.modifierInfo.icon ?? '✨';
		const modifierIcon = modifierIconValue ? `${modifierIconValue} ` : '';
		const raidLabel = formatTargetLabel(
			details.raid.icon ?? '',
			details.raid.name,
		);
		// format adds space after icon for readability
		const happinessLabel =
			`${details.happinessInfo.icon} ${sign(details.penaltyAmt)}${details.penaltyAmt} ${details.happinessInfo.label}`.replace(
				/\s{2,}/gu,
				' ',
			);
		expect(log).toEqual([
			{
				text: actionHeadline,
				depth: 0,
				kind: 'headline',
			},
			{
				text: `♾️ ${details.passiveIcon ? `${details.passiveIcon} ` : ''}${details.passiveName} activated`,
				depth: 1,
				kind: 'group',
			},
			{
				text: `${modifierIcon}Modifier on ${raidLabel}: Whenever it resolves, ${happinessLabel}`,
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
