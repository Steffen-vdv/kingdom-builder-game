import { beforeEach, describe, it, expect } from 'vitest';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	type Summary,
} from '../src/translation/content';
import { signed } from '../src/translation/effects/helpers';
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
		const summary = describeContent(
			'building',
			ids.transferBuilding,
			translation,
		);
		const { effects, description } = splitSummary(summary);
		const modifier = getModifier(engineContext, ids.transferBuilding);
		const adjust = Number(modifier.params?.['adjust'] ?? 0);
		const raid = engineContext.actions.get(ids.raidAction);
		const transferDescriptor = translation.assets.transfer;
		const transferIcon = transferDescriptor.icon ?? '🔁';
		const transferLabel = transferDescriptor.label ?? 'Resource Transfer';
		const sign = adjust >= 0 ? '+' : '-';
		// Simplified format:
		// modifier icon + target label: transfer icon + sign + amount% + keyword
		const clause = `${modifierIcon}${formatTargetLabel(
			raid.icon ?? '',
			raid.name,
		)}: ${transferIcon} ${sign}${Math.abs(adjust)}% ${transferLabel}`;
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
		const keywords = translation.assets.keywords ?? {
			resourceGain: 'Resource Gain',
		};
		const summary = summarizeContent(
			'building',
			ids.developmentBuilding,
			translation,
		);
		const development = engineContext.developments.get(ids.harvestDevelopment);
		const modifier = getModifier(engineContext, ids.developmentBuilding);
		const resourceEffect = getResourceEffect(modifier);
		// Resource uses resourceId and change.amount
		const key = resourceEffect.params?.['resourceId'] as string;
		const change = resourceEffect.params?.['change'] as
			| { amount: number }
			| undefined;
		const amount = Number(change?.amount ?? 0);
		const resourceIcon =
			selectAttackResourceDescriptor(translation, key).icon || key;
		// Simplified format:
		// modifier icon + dev icon: + sign + resource icon + amount + keyword
		const expected = `${modifierIcon}${development.icon}: ${signed(
			amount,
		)}${resourceIcon}${Math.abs(amount)} ${keywords.resourceGain}`;
		expect(collectText(summary)).toContain(expected);
	});

	it('describes development modifier with detailed clause', () => {
		const { engineContext, translation, ids } = synthetic;
		const modifierInfo = translation.assets.modifiers.result ?? { icon: '✨' };
		const modifierIcon = modifierInfo.icon ?? '✨';
		const keywords = translation.assets.keywords ?? {
			resourceGain: 'Resource Gain',
		};
		const summary = describeContent(
			'building',
			ids.developmentBuilding,
			translation,
		);
		const development = engineContext.developments.get(ids.harvestDevelopment);
		const modifier = getModifier(engineContext, ids.developmentBuilding);
		const resourceEffect = getResourceEffect(modifier);
		// Resource uses resourceId and change.amount
		const key = resourceEffect.params?.['resourceId'] as string;
		const change = resourceEffect.params?.['change'] as
			| { amount: number }
			| undefined;
		const amount = Number(change?.amount ?? 0);
		const icon = selectAttackResourceDescriptor(translation, key).icon || key;
		// Simplified format:
		// modifier icon + target label: sign + resource icon + amount + keyword
		const clause = `${modifierIcon}${formatTargetLabel(
			development.icon ?? '',
			development.name,
		)}: ${signed(amount)}${icon}${Math.abs(amount)} ${keywords.resourceGain}`;
		expect(collectText(summary)).toContain(clause);
	});
});
