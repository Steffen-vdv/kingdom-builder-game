import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	type Summary,
} from '../src/translation/content';
import {
	MODIFIER_INFO,
	POPULATION_INFO,
	RESOURCE_TRANSFER_ICON,
} from '@kingdom-builder/contents';
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

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const RESOURCES_KEYWORD = `${GENERAL_RESOURCE_ICON} ${GENERAL_RESOURCE_LABEL}`;
function expectHoistedActionCard(
	ctx: RaidersGuildSyntheticContext['ctx'],
	description: Summary | undefined,
	actionId: string,
) {
	expect(description).toBeDefined();
	const hoisted = description?.[0];
	expect(typeof hoisted).toBe('object');
	if (!hoisted || typeof hoisted === 'string') {
		return;
	}
	const action = ctx.actions.get(actionId);
	expect(hoisted.title).toBe(formatTargetLabel(action.icon ?? '', action.name));
	expect(hoisted.items as Summary).toEqual(
		getActionSummaryItems(ctx, actionId),
	);
}

describe('raiders guild translation', () => {
	let synthetic: RaidersGuildSyntheticContext;

	beforeEach(() => {
		synthetic = createRaidersGuildContext();
	});

	it('describes transfer modifier with hoisted action card', () => {
		const { ctx, ids } = synthetic;
		const summary = describeContent('building', ids.transferBuilding, ctx);
		const { effects, description } = splitSummary(summary);
		const modifier = getModifier(ctx, ids.transferBuilding);
		const adjust = Number(modifier.params?.['adjust'] ?? 0);
		const raid = ctx.actions.get(ids.raidAction);
		const clause = `${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${formatTargetLabel(
			raid.icon ?? '',
			raid.name,
		)}: Whenever it transfers ${RESOURCES_KEYWORD}, ${RESOURCE_TRANSFER_ICON} ${increaseOrDecrease(
			adjust,
		)} transfer by ${Math.abs(adjust)}%`;
		expect(collectText(effects)).toContain(clause);
		expectHoistedActionCard(ctx, description, ids.raidAction);
	});

	it('summarizes population modifier compactly', () => {
		const { ctx, ids } = synthetic;
		const summary = summarizeContent('building', ids.populationBuilding, ctx);
		const ledger = ctx.actions.get(ids.ledgerAction);
		const modifier = getModifier(ctx, ids.populationBuilding);
		const amount = Number(modifier.params?.['amount'] ?? 0);
		const actionIcon =
			ledger.icon && ledger.icon.trim().length ? ledger.icon : ledger.name;
		const expected = `${MODIFIER_INFO.result.icon}${POPULATION_INFO.icon}(${actionIcon}): ${GENERAL_RESOURCE_ICON}${signed(
			amount,
		)}${Math.abs(amount)}`;
		expect(collectText(summary)).toContain(expected);
	});

	it('summarizes development modifier compactly', () => {
		const { ctx, ids } = synthetic;
		const summary = summarizeContent('building', ids.developmentBuilding, ctx);
		const development = ctx.developments.get(ids.harvestDevelopment);
		const modifier = getModifier(ctx, ids.developmentBuilding);
		const resourceEffect = getResourceEffect(modifier);
		const key = resourceEffect.params?.['key'] as string;
		const amount = Number(resourceEffect.params?.['amount'] ?? 0);
		const resourceIcon = selectAttackResourceDescriptor(key).icon || key;
		const expected = `${MODIFIER_INFO.result.icon}${development.icon}: ${resourceIcon}${signed(
			amount,
		)}${Math.abs(amount)}`;
		expect(collectText(summary)).toContain(expected);
	});

	it('describes population modifier with detailed clause', () => {
		const { ctx, ids } = synthetic;
		const summary = describeContent('building', ids.populationBuilding, ctx);
		const ledger = ctx.actions.get(ids.ledgerAction);
		const modifier = getModifier(ctx, ids.populationBuilding);
		const amount = Number(modifier.params?.['amount'] ?? 0);
		const target = `${POPULATION_INFO.icon} ${POPULATION_INFO.label} through ${formatTargetLabel(
			ledger.icon ?? '',
			ledger.name,
		)}`;
		const clause = `${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${target}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${GENERAL_RESOURCE_ICON}${signed(
			amount,
		)}${Math.abs(amount)} more of that resource`;
		expect(collectText(summary)).toContain(clause);
	});

	it('describes development modifier with detailed clause', () => {
		const { ctx, ids } = synthetic;
		const summary = describeContent('building', ids.developmentBuilding, ctx);
		const development = ctx.developments.get(ids.harvestDevelopment);
		const modifier = getModifier(ctx, ids.developmentBuilding);
		const resourceEffect = getResourceEffect(modifier);
		const key = resourceEffect.params?.['key'] as string;
		const amount = Number(resourceEffect.params?.['amount'] ?? 0);
		const icon = selectAttackResourceDescriptor(key).icon || key;
		const clause = `${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${formatTargetLabel(
			development.icon ?? '',
			development.name,
		)}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${icon}${signed(amount)}${Math.abs(
			amount,
		)} more of that resource`;
		expect(collectText(summary)).toContain(clause);
	});
});
