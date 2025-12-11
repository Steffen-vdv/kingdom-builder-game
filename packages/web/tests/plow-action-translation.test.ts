import { describe, it, expect } from 'vitest';
import {
	createSyntheticPlowContent,
	SYNTHETIC_UPKEEP_PHASE,
	SYNTHETIC_PASSIVE_INFO,
	SYNTHETIC_LAND_INFO,
	SYNTHETIC_SLOT_INFO,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_RESOURCES,
	registerSyntheticPlowResources,
} from './fixtures/syntheticPlow';
import {
	summarizeContent,
	describeContent,
	splitSummary,
} from '../src/translation/content';
import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPhaseDefinition,
	SessionRuleSnapshot,
} from '@kingdom-builder/protocol/session';
import { createTranslationContext } from '../src/translation/context/createTranslationContext';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createEmptySnapshotMetadata,
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

function createTranslationHarness() {
	const synthetic = createSyntheticPlowContent();
	const registries = createSessionRegistries();
	registerSyntheticPlowResources(registries.resources);
	registries.actions.add(synthetic.expand.id, { ...synthetic.expand });
	registries.actions.add(synthetic.till.id, { ...synthetic.till });
	registries.actions.add(synthetic.plow.id, { ...synthetic.plow });
	registries.buildings.add(synthetic.building.id, { ...synthetic.building });

	const baseResources = synthetic.start.player.resources;
	const activePlayer = createSnapshotPlayer({
		id: 'A',
		name: 'Active Player',
		resources: { ...baseResources },
		buildings: [synthetic.building.id],
		actions: [synthetic.expand.id, synthetic.till.id, synthetic.plow.id],
	});
	const opponent = createSnapshotPlayer({
		id: 'B',
		name: 'Opponent',
		resources: { ...baseResources },
	});

	const phaseDefinitions: SessionPhaseDefinition[] = synthetic.phases.map(
		(phase) => {
			return {
				id: phase.id,
				icon: phase.icon,
				label: phase.label,
				action: phase.action ?? false,
				steps: (phase.steps ?? []).map((step) => ({
					id: step.id,
					title: step.title,
					icon: step.icon,
					triggers: step.triggers,
					effects: (step.effects ?? []).map((effect) => ({
						...effect,
					})),
				})),
			} satisfies SessionPhaseDefinition;
		},
	);
	const ruleSnapshot: SessionRuleSnapshot = {
		tieredResourceKey: synthetic.rules.tieredResourceKey,
		tierDefinitions: [...synthetic.rules.tierDefinitions],
		winConditions: [...synthetic.rules.winConditions],
	} satisfies SessionRuleSnapshot;
	// Resource metadata for translation layer
	const resourceMetadata: Record<string, SessionMetadataDescriptor> =
		Object.fromEntries(
			Object.entries(SYNTHETIC_RESOURCES).map(([key, info]) => {
				return [key, { icon: info.icon, label: info.label }];
			}),
		);
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: phaseDefinitions,
		actionCostResource: 'ap',
		ruleSnapshot,
		metadata: createEmptySnapshotMetadata({
			resources: resourceMetadata,
			assets: {
				land: {
					icon: SYNTHETIC_LAND_INFO.icon,
					label: SYNTHETIC_LAND_INFO.label,
				},
				slot: {
					icon: SYNTHETIC_SLOT_INFO.icon,
					label: SYNTHETIC_SLOT_INFO.label,
				},
				passive: {
					icon: SYNTHETIC_PASSIVE_INFO.icon,
					label: SYNTHETIC_PASSIVE_INFO.label,
				},
				upkeep: {
					icon: SYNTHETIC_UPKEEP_PHASE.icon,
					label: SYNTHETIC_UPKEEP_PHASE.label,
				},
				action: {
					icon: '🎯',
					label: 'Action',
					plural: 'Actions',
				},
				development: {
					icon: '🏗️',
					label: 'Development',
					plural: 'Developments',
				},
				modifiers: {
					cost: { icon: '✨', label: 'Cost Adjustment' },
					result: { icon: '✨', label: 'Outcome Adjustment' },
				},
				keywords: {
					resourceGain: 'Resource Gain',
					cost: 'Cost',
				},
			},
		}),
		resourceCatalog: synthetic.resourceCatalog,
		resourceMetadata,
	});
	const translation = createTranslationContext(
		session,
		registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);
	return { ...synthetic, registries, session, translation };
}

describe('plow action translation', () => {
	it('summarizes plow action', () => {
		const { translation, expand, till, plow, plowPassive } =
			createTranslationHarness();
		const summary = summarizeContent('action', plow.id, translation);
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const upkeepLabel = SYNTHETIC_UPKEEP_PHASE.label;
		const upkeepIcon = SYNTHETIC_UPKEEP_PHASE.icon;
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modResourceId =
			(costMod?.params as { resourceId?: string })?.resourceId ?? '';
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		// Use metadata for the resource icon
		const modDescriptor = translation.resourceMetadata?.get?.(modResourceId);
		const modIcon = modDescriptor?.icon ?? '';
		const modifierInfo = translation.assets.modifiers?.cost ?? {};
		const modifierIcon = modifierInfo.icon ?? '✨';
		const actionKeyword = translation.assets.action ?? { icon: '🎯' };
		const keywords = translation.assets.keywords ?? { cost: 'Cost' };
		const passiveIcon = (plowPassive as { icon?: string })?.icon ?? '';
		const passiveName =
			(plowPassive as { name?: string })?.name ?? SYNTHETIC_PASSIVE_INFO.label;
		// Simplified format:
		// modifier icon + target icon: sign + resource icon + amount + keyword
		const sign = modAmt >= 0 ? '+' : '-';
		expect(summary).toEqual([
			`${expand.icon} ${expand.name}`,
			`${till.icon} ${till.name}`,
			{
				title: `+♾️: ${passiveIcon} ${passiveName}`,
				items: [
					`${modifierIcon}${actionKeyword.icon}: ${sign}${modIcon}${Math.abs(modAmt)} ${keywords.cost}`,
				],
			},
			{
				title: `On your ${upkeepIcon} ${upkeepLabel} Phase`,
				items: [`-♾️: ${passiveIcon} ${passiveName}`],
			},
		]);
	});

	it('describes plow action without perform prefix and with passive icon', () => {
		const { translation, plow, plowPassive } = createTranslationHarness();
		const desc = describeContent('action', plow.id, translation);
		const titles = desc.map((entry) => {
			return typeof entry === 'string' ? entry : entry.title;
		});
		titles.forEach((title) => {
			expect(title).not.toMatch(/^Perform action/);
		});
		// Check the passive add entry uses the new format
		const passiveIcon =
			(plowPassive as { icon?: string })?.icon ?? SYNTHETIC_PASSIVE_INFO.icon;
		const passiveName =
			(plowPassive as { name?: string })?.name ?? SYNTHETIC_PASSIVE_INFO.label;
		const passiveAddEntry = desc.find((entry) => {
			if (typeof entry !== 'object') {
				return false;
			}
			return entry.title.includes('Gain ♾️ Passive');
		}) as { title: string; items?: unknown[] } | undefined;
		expect(passiveAddEntry?.title).toBe(
			`Gain ♾️ Passive: ${passiveIcon} ${passiveName}`,
		);
	});

	it('keeps performed system actions in effects', () => {
		const { translation, expand, till, plow, plowPassive } =
			createTranslationHarness();
		const summary = describeContent('action', plow.id, translation);
		const { effects, description } = splitSummary(summary);
		expect(description).toBeUndefined();
		const passive = plow.effects.find((e: EffectDef) => e.type === 'passive');
		const costMod = passive?.effects.find(
			(e: EffectDef) => e.type === 'cost_mod',
		);
		const modResourceId =
			(costMod?.params as { resourceId?: string })?.resourceId ?? '';
		const modAmt = (costMod?.params as { amount?: number })?.amount ?? 0;
		// Use metadata for the resource icon
		const modDescriptor = translation.resourceMetadata?.get?.(modResourceId);
		const modIcon = modDescriptor?.icon ?? '';
		const passiveName = ((plowPassive as { name?: string })?.name ??
			SYNTHETIC_PASSIVE_INFO.label) as string;
		const passiveIcon = ((plowPassive as { icon?: string })?.icon ??
			SYNTHETIC_PASSIVE_INFO.icon) as string;
		const upkeepLabel = SYNTHETIC_UPKEEP_PHASE.label;
		const upkeepIcon = SYNTHETIC_UPKEEP_PHASE.icon;
		const upkeepDescriptionLabel = `${
			upkeepIcon ? `${upkeepIcon} ` : ''
		}${upkeepLabel}`;
		const expandLand = expand.effects.find((e: EffectDef) => e.type === 'land');
		const landCount = (expandLand?.params as { count?: number })?.count ?? 0;
		const expandHap = expand.effects.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				((e.params as { key?: string }).resourceId === 'happiness' ||
					(e.params as { resourceId?: string }).resourceId ===
						'resource:synthetic:happiness'),
		);
		const hapChange = (expandHap?.params as { change?: { amount?: number } })
			?.change;
		const hapLegacyAmt = (expandHap?.params as { amount?: number })?.amount;
		const hapAmt = hapChange?.amount ?? hapLegacyAmt ?? 0;
		const hapLegacyDesc = translation.assets.resources?.happiness;
		const hapDesc = translation.resourceMetadata?.get?.(
			'resource:synthetic:happiness',
		);
		const hapDescriptor = hapLegacyDesc ?? hapDesc ?? {};
		const hapLabel = hapDescriptor.label ?? 'happiness';
		const hapIcon = hapDescriptor.icon ?? '';
		const modifierInfo = translation.assets.modifiers?.cost ?? {};
		const modifierIcon = modifierInfo.icon ?? '✨';
		const actionKeyword = translation.assets.action ?? {
			icon: '🎯',
			plural: 'Actions',
		};
		const keywords = translation.assets.keywords ?? { cost: 'Cost' };
		const sign = modAmt >= 0 ? '+' : '-';
		const modMagnitude = Math.abs(modAmt);
		const landAsset = translation.assets.land ?? {};
		const landIcon = landAsset.icon ?? SYNTHETIC_LAND_INFO.icon;
		const landLabel = landAsset.label ?? SYNTHETIC_LAND_INFO.label;
		const slotAsset = translation.assets.slot ?? {};
		const slotIcon = slotAsset.icon ?? SYNTHETIC_SLOT_INFO.icon;
		const slotLabel = slotAsset.label ?? SYNTHETIC_SLOT_INFO.label;
		// Simplified format:
		// modifier icon + target label: sign + resource icon + amount + keyword
		expect(effects).toEqual([
			{
				title: `${expand.icon} ${expand.name}`,
				items: [
					`${landIcon} ${landCount >= 0 ? '+' : ''}${landCount} ${landLabel}`,
					`${hapIcon} ${hapAmt >= 0 ? '+' : ''}${hapAmt} ${hapLabel}`,
				],
			},
			{
				title: `${till.icon} ${till.name}`,
				items: [
					`Till ${landIcon} ${landLabel} to unlock ${slotIcon} ${slotLabel}`,
				],
			},
			{
				title: `Gain ♾️ Passive: ${passiveIcon} ${passiveName}`,
				items: [
					`${modifierIcon}${actionKeyword.icon} All ${actionKeyword.plural}: ${sign}${modIcon}${modMagnitude} ${keywords.cost}`,
				],
			},
			{
				title: `On your ${upkeepDescriptionLabel} Phase`,
				items: [`Remove ♾️ Passive: ${passiveIcon} ${passiveName}`],
			},
		]);
	});
});
