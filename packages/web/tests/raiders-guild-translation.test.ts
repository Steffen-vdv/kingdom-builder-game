import { beforeEach, describe, it, expect } from 'vitest';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	type Summary,
} from '../src/translation/content';
import { GENERAL_RESOURCE_ICON, GENERAL_RESOURCE_LABEL } from '../src/icons';
import { increaseOrDecrease, signed } from '../src/translation/effects/helpers';
import { formatTargetLabel } from '../src/translation/effects/formatters/modifier_helpers';
import {
	collectText,
	createRaidersGuildContext,
	getActionSummaryItems,
	getModifier,
	getResourceEffect,
	type RaidersGuildSyntheticContext,
} from './fixtures/syntheticRaidersGuild';
import { selectAttackResourceDescriptor } from '../src/translation/effects/formatters/attack/registrySelectors';

const RESOURCES_KEYWORD = `${GENERAL_RESOURCE_ICON} ${GENERAL_RESOURCE_LABEL}`;
function expectHoistedActionCard(
	engineContext: RaidersGuildSyntheticContext['engineContext'],
	translation: RaidersGuildSyntheticContext['translation'],
	description: Summary | undefined,
	actionId: string,
) {
	expect(description).toBeDefined();
	const hoisted = description?.[0];
	expect(typeof hoisted).toBe('object');
	if (!hoisted || typeof hoisted === 'string') {
		return;
	}
	const action = engineContext.actions.get(actionId);
	expect(hoisted.title).toBe(formatTargetLabel(action.icon ?? '', action.name));
	expect(hoisted.items as Summary).toEqual(
		getActionSummaryItems(translation, actionId),
	);
}

describe('raiders guild translation', () => {
	let synthetic: RaidersGuildSyntheticContext;

	beforeEach(() => {
		synthetic = createRaidersGuildContext();
	});

	it('describes transfer modifier with hoisted action card', () => {
		const { engineContext, translation, ids } = synthetic;
		const modifierInfo = translation.assets.modifiers.result ?? { icon: '✨' };
		const modifierIcon = modifierInfo.icon ?? '✨';
		const modifierLabel = modifierInfo.label ?? 'result';
		const modifierText = modifierIcon
			? `${modifierIcon} Modifier`
			: `${modifierLabel} Modifier`;
		const summary = describeContent(
			'building',
			ids.transferBuilding,
			translation,
		);
		const { effects, description } = splitSummary(summary);
		const modifier = getModifier(engineContext, ids.transferBuilding);
		const adjust = Number(modifier.params?.['adjust'] ?? 0);
		const raid = engineContext.actions.get(ids.raidAction);
		const transferIcon = translation.assets.transfer.icon ?? '🔁';
		const clause = `${modifierText} on ${formatTargetLabel(
			raid.icon ?? '',
			raid.name,
		)}: Whenever it transfers ${RESOURCES_KEYWORD}, ${transferIcon} ${increaseOrDecrease(
			adjust,
		)} transfer by ${Math.abs(adjust)}%`;
		expect(collectText(effects)).toContain(clause);
		expectHoistedActionCard(
			engineContext,
			translation,
			description,
			ids.raidAction,
		);
	});

	it('summarizes development modifier compactly', () => {
		const { engineContext, translation, ids } = synthetic;
		const modifierInfo = translation.assets.modifiers.result ?? { icon: '✨' };
		const modifierIcon = modifierInfo.icon ?? '✨';
		const summary = summarizeContent(
			'building',
			ids.developmentBuilding,
			translation,
		);
		const development = engineContext.developments.get(ids.harvestDevelopment);
		const modifier = getModifier(engineContext, ids.developmentBuilding);
		const resourceEffect = getResourceEffect(modifier);
		// ResourceV2 uses resourceId and change.amount
		const key = resourceEffect.params?.['resourceId'] as string;
		const change = resourceEffect.params?.['change'] as
			| { amount: number }
			| undefined;
		const amount = Number(change?.amount ?? 0);
		const resourceIcon =
			selectAttackResourceDescriptor(translation, key).icon || key;
		const expected = `${modifierIcon}${development.icon}: ${resourceIcon}${signed(
			amount,
		)}${Math.abs(amount)}`;
		expect(collectText(summary)).toContain(expected);
	});

	it('describes development modifier with detailed clause', () => {
		const { engineContext, translation, ids } = synthetic;
		const modifierInfo = translation.assets.modifiers.result ?? { icon: '✨' };
		const modifierIcon = modifierInfo.icon ?? '✨';
		const modifierLabel = modifierInfo.label ?? 'result';
		const modifierText = modifierIcon
			? `${modifierIcon} Modifier`
			: `${modifierLabel} Modifier`;
		const summary = describeContent(
			'building',
			ids.developmentBuilding,
			translation,
		);
		const development = engineContext.developments.get(ids.harvestDevelopment);
		const modifier = getModifier(engineContext, ids.developmentBuilding);
		const resourceEffect = getResourceEffect(modifier);
		// ResourceV2 uses resourceId and change.amount
		const key = resourceEffect.params?.['resourceId'] as string;
		const change = resourceEffect.params?.['change'] as
			| { amount: number }
			| undefined;
		const amount = Number(change?.amount ?? 0);
		const icon = selectAttackResourceDescriptor(translation, key).icon || key;
		const clause = `${modifierText} on ${formatTargetLabel(
			development.icon ?? '',
			development.name,
		)}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${icon}${signed(amount)}${Math.abs(
			amount,
		)} more of that resource`;
		expect(collectText(summary)).toContain(clause);
	});
});
