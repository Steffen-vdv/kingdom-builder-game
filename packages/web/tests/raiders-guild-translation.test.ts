import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
describeContent,
splitSummary,
summarizeContent,
type Summary,
} from '../src/translation/content';
import { RESOURCE_TRANSFER_ICON } from '@kingdom-builder/contents';
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
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';
import { selectResourceIconLabel } from '../src/translation/registrySelectors';

vi.mock('@kingdom-builder/engine', async () => {
return await import('../../engine/src');
});

const RESOURCES_KEYWORD = `${GENERAL_RESOURCE_ICON} ${GENERAL_RESOURCE_LABEL}`;

function expectHoistedActionCard(
ctx: RaidersGuildSyntheticContext['ctx'],
translationContext: ReturnType<typeof createTranslationContextForEngine>,
description: Summary | undefined,
actionId: string,
): void {
expect(description).toBeDefined();
const hoisted = description?.[0];
expect(typeof hoisted).toBe('object');
if (!hoisted || typeof hoisted === 'string') {
return;
}
const action = translationContext.actions.get(actionId);
expect(hoisted.title).toBe(formatTargetLabel(action.icon ?? '', action.name));
expect(hoisted.items as Summary).toEqual(getActionSummaryItems(ctx, actionId));
}

describe('raiders guild translation', () => {
let synthetic: RaidersGuildSyntheticContext;
let translationContext: ReturnType<typeof createTranslationContextForEngine>;

beforeEach(() => {
synthetic = createRaidersGuildContext();
translationContext = createTranslationContextForEngine(synthetic.ctx);
});

it('describes transfer modifier with hoisted action card', () => {
const { ctx, ids } = synthetic;
const summary = describeContent(
'building',
ids.transferBuilding,
translationContext,
);
const { effects, description } = splitSummary(summary);
const modifier = getModifier(ctx, ids.transferBuilding);
const adjust = Number(modifier.params?.['adjust'] ?? 0);
const raid = translationContext.actions.get(ids.raidAction);
const modifierInfo = translationContext.assets.modifiers.result;
const clause = `${modifierInfo.icon} ${modifierInfo.label} on ${formatTargetLabel(
raid.icon ?? '',
raid.name,
)}: Whenever it transfers ${RESOURCES_KEYWORD}, ${RESOURCE_TRANSFER_ICON} ${increaseOrDecrease(
adjust,
)} transfer by ${Math.abs(adjust)}%`;
expect(collectText(effects)).toContain(clause);
expectHoistedActionCard(ctx, translationContext, description, ids.raidAction);
});

it('summarizes population modifier compactly', () => {
const { ctx, ids } = synthetic;
const summary = summarizeContent(
'building',
ids.populationBuilding,
translationContext,
);
const ledger = translationContext.actions.get(ids.ledgerAction);
const modifier = getModifier(ctx, ids.populationBuilding);
const amount = Number(modifier.params?.['amount'] ?? 0);
const actionIcon =
ledger.icon && ledger.icon.trim().length ? ledger.icon : ledger.name;
const modifierIcon = translationContext.assets.modifiers.result.icon ?? '';
const populationIcon = translationContext.assets.population.icon ?? '';
const expected = `${modifierIcon}${populationIcon}(${actionIcon}): ${GENERAL_RESOURCE_ICON}${signed(
amount,
)}${Math.abs(amount)}`;
expect(collectText(summary)).toContain(expected);
});

it('summarizes development modifier compactly', () => {
const { ctx, ids } = synthetic;
const summary = summarizeContent(
'building',
ids.developmentBuilding,
translationContext,
);
const development = translationContext.developments.get(
ids.harvestDevelopment,
);
const modifier = getModifier(ctx, ids.developmentBuilding);
const resourceEffect = getResourceEffect(modifier);
const key = resourceEffect.params?.['key'] as string;
const amount = Number(resourceEffect.params?.['amount'] ?? 0);
const resourceIcon = selectResourceIconLabel(translationContext, key).icon || key;
const modifierIcon = translationContext.assets.modifiers.result.icon ?? '';
const expected = `${modifierIcon}${development.icon}: ${resourceIcon}${signed(
amount,
)}${Math.abs(amount)}`;
expect(collectText(summary)).toContain(expected);
});

it('describes population modifier with detailed clause', () => {
const { ctx, ids } = synthetic;
const summary = describeContent(
'building',
ids.populationBuilding,
translationContext,
);
const ledger = translationContext.actions.get(ids.ledgerAction);
const modifier = getModifier(ctx, ids.populationBuilding);
const amount = Number(modifier.params?.['amount'] ?? 0);
const populationInfo = translationContext.assets.population;
const target = `${populationInfo.icon} ${populationInfo.label} through ${formatTargetLabel(
ledger.icon ?? '',
ledger.name,
)}`;
const modifierInfo = translationContext.assets.modifiers.result;
const clause = `${modifierInfo.icon} ${modifierInfo.label} on ${target}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${GENERAL_RESOURCE_ICON}${signed(
amount,
)}${Math.abs(amount)} more of that resource`;
expect(collectText(summary)).toContain(clause);
});

it('describes development modifier with detailed clause', () => {
const { ctx, ids } = synthetic;
const summary = describeContent(
'building',
ids.developmentBuilding,
translationContext,
);
const development = translationContext.developments.get(
ids.harvestDevelopment,
);
const modifier = getModifier(ctx, ids.developmentBuilding);
const resourceEffect = getResourceEffect(modifier);
const key = resourceEffect.params?.['key'] as string;
const amount = Number(resourceEffect.params?.['amount'] ?? 0);
const icon = selectResourceIconLabel(translationContext, key).icon || key;
const modifierInfo = translationContext.assets.modifiers.result;
const clause = `${modifierInfo.icon} ${modifierInfo.label} on ${formatTargetLabel(
development.icon ?? '',
development.name,
)}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${icon}${signed(amount)}${Math.abs(
amount,
)} more of that resource`;
expect(collectText(summary)).toContain(clause);
});
});
