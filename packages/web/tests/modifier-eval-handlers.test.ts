import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { registerModifierEvalHandler } from '../src/translation/effects/formatters/modifier';
import { formatTargetLabel } from '../src/translation/effects/formatters/modifier_helpers';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from './helpers/sessionFixtures';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createTranslationContext } from '../src/translation/context';
import {
	selectModifierInfo,
	selectResourceDescriptor,
	selectTransferDescriptor,
	selectKeywordLabels,
} from '../src/translation/effects/registrySelectors';

type ModifierHarnessOptions = {
	customizeMetadata?: (
		metadata: ReturnType<typeof createTestSessionScaffold>['metadata'],
	) => void;
};

function createModifierHarness(options: ModifierHarnessOptions = {}) {
	const scaffold = createTestSessionScaffold();
	const metadata = structuredClone(scaffold.metadata);
	options.customizeMetadata?.(metadata);
	const activePlayer = createSnapshotPlayer({
		id: 'player-1',
		name: 'Player One',
		resources: {},
	});
	const opponent = createSnapshotPlayer({
		id: 'player-2',
		name: 'Player Two',
		resources: {},
	});
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	const translationContext = createTranslationContext(
		session,
		scaffold.registries,
		session.metadata,
		{
			ruleSnapshot: scaffold.ruleSnapshot,
			passiveRecords: session.passiveRecords,
		},
	);
	return {
		translationContext,
		registries: scaffold.registries,
	};
}

function selectDevelopmentWithIcon(
	registries: ReturnType<typeof createTestSessionScaffold>['registries'],
) {
	for (const [id, definition] of registries.developments.entries()) {
		if (definition.icon && definition.icon.trim().length > 0) {
			return { id, definition } as const;
		}
	}
	const [firstId, firstDefinition] =
		registries.developments.entries().next().value ?? [];
	if (!firstId || !firstDefinition) {
		throw new Error(
			'Expected at least one development definition for modifier tests.',
		);
	}
	return { id: firstId, definition: firstDefinition } as const;
}

function selectResourceWithIcon(
	translationContext: ReturnType<typeof createTranslationContext>,
) {
	// Get a resource with an icon from the resourceMetadata context
	const resourceIds = [
		'resource:core:gold',
		'resource:core:happiness',
		'resource:core:ap',
		'resource:core:castleHP',
	];
	for (const resourceId of resourceIds) {
		const entry = translationContext.resourceMetadata.get(resourceId);
		if (entry?.icon) {
			return { id: resourceId, icon: entry.icon, label: entry.label ?? '' };
		}
	}
	// Fallback to first available resource
	const fallbackId = resourceIds[0];
	const fallbackEntry = translationContext.resourceMetadata.get(fallbackId);
	return {
		id: fallbackId,
		icon: fallbackEntry?.icon ?? '',
		label: fallbackEntry?.label ?? fallbackId,
	};
}

function selectActionWithIcon(
	registries: ReturnType<typeof createTestSessionScaffold>['registries'],
) {
	for (const [id, definition] of registries.actions.entries()) {
		if (definition.icon && definition.icon.trim().length > 0) {
			return { id, definition } as const;
		}
	}
	const [firstId, firstDefinition] =
		registries.actions.entries().next().value ?? [];
	if (!firstId || !firstDefinition) {
		throw new Error(
			'Expected at least one action definition for modifier tests.',
		);
	}
	return { id: firstId, definition: firstDefinition } as const;
}

function joinParts(...parts: Array<string | undefined>) {
	return parts.filter(Boolean).join(' ').trim();
}

describe('modifier evaluation handlers', () => {
	it('allows registering custom evaluation formatters', () => {
		const { translationContext } = createModifierHarness();
		registerModifierEvalHandler('test_eval', {
			summarize: () => ['handled'],
			describe: () => ['handled desc'],
		});
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: { evaluation: { type: 'test_eval', id: 'x' } },
		};
		const summary = summarizeEffects([eff], translationContext);
		const description = describeEffects([eff], translationContext);
		expect(summary).toContain('handled');
		expect(description).toContain('handled desc');
	});

	it('formats development result modifiers with resource removal', () => {
		const { translationContext, registries } = createModifierHarness();
		const { id: developmentId, definition: developmentDef } =
			selectDevelopmentWithIcon(registries);
		const resourceDescriptor = selectResourceWithIcon(translationContext);
		const resourceId = resourceDescriptor.id;
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				evaluation: { type: 'development', id: developmentId },
			},
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { resourceId, change: { amount: 2 } },
				},
			],
		};
		const summary = summarizeEffects([eff], translationContext);
		const description = describeEffects([eff], translationContext);
		const resultDescriptor = selectModifierInfo(translationContext, 'result');
		const resourceInfo = selectResourceDescriptor(
			translationContext,
			resourceId,
		);
		const keywords = selectKeywordLabels(translationContext);
		const developmentInfo = translationContext.developments.get(developmentId);
		const targetIcon =
			developmentInfo?.icon && developmentInfo.icon.trim().length > 0
				? developmentInfo.icon
				: (developmentInfo?.name ?? developmentDef.name ?? developmentId);
		// Summary format: ✨🌾: -🪙2 Resource Gain
		expect(summary).toHaveLength(1);
		expect(
			summary[0].startsWith(`${resultDescriptor.icon}${targetIcon}: `),
		).toBe(true);
		const resourceToken = resourceInfo.icon ?? resourceInfo.label ?? resourceId;
		expect(summary[0]).toContain(`-${resourceToken}2`);
		expect(summary[0]).toContain(keywords.resourceGain);
		// Describe format: ✨🌾 Farm: -🪙2 Resource Gain
		expect(description).not.toHaveLength(0);
		const primaryLine = description[0];
		const targetLabel = joinParts(
			developmentInfo?.icon ?? developmentDef.icon,
			developmentInfo?.name ?? developmentDef.name ?? developmentId,
		);
		expect(
			primaryLine.startsWith(`${resultDescriptor.icon}${targetLabel}:`),
		).toBe(true);
		expect(primaryLine).toContain(`-${resourceToken}2`);
		expect(primaryLine).toContain(keywords.resourceGain);
	});

	it('formats cost modifiers with percent adjustments', () => {
		const { translationContext, registries } = createModifierHarness();
		const { id: actionId, definition: actionDef } =
			selectActionWithIcon(registries);
		const resourceDescriptor = selectResourceWithIcon(translationContext);
		const resourceId = resourceDescriptor.id;
		const eff: EffectDef = {
			type: 'cost_mod',
			method: 'add',
			params: {
				id: 'synthetic:discount',
				resourceId,
				actionId,
				percent: -0.2,
			},
		};
		const summary = summarizeEffects([eff], translationContext);
		const description = describeEffects([eff], translationContext);
		const costDescriptor = selectModifierInfo(translationContext, 'cost');
		const resourceInfo = selectResourceDescriptor(
			translationContext,
			resourceId,
		);
		const keywords = selectKeywordLabels(translationContext);
		const actionInfo = translationContext.actions.get(actionId);
		const actionIcon =
			actionInfo?.icon && actionInfo.icon.trim().length > 0
				? actionInfo.icon
				: (actionInfo?.name ?? actionDef.name ?? actionId);
		const resourceIcon = resourceInfo.icon ?? resourceId;
		// Summary format: ✨🚜: 🪙-20% Cost
		expect(summary).toEqual([
			`${costDescriptor.icon}${actionIcon}: ${resourceIcon}-20% ${keywords.cost}`,
		]);
		// Describe format: ✨🚜 Plow: -20% 🪙 Cost
		const targetLabel = joinParts(
			actionInfo?.icon ?? actionDef.icon,
			actionInfo?.name ?? actionDef.name ?? actionId,
		);
		expect(description).toEqual([
			`${costDescriptor.icon}${targetLabel}: -20% ${resourceIcon} ${keywords.cost}`,
		]);
	});

	it('formats transfer percent evaluation modifiers for arbitrary actions', () => {
		const { translationContext, registries } = createModifierHarness();
		const { id: actionId, definition: actionDef } =
			selectActionWithIcon(registries);
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:transfer-bonus',
				evaluation: { type: 'transfer_pct', id: actionId },
				adjust: 10,
			},
		};
		const summary = summarizeEffects([eff], translationContext);
		const description = describeEffects([eff], translationContext);
		const resultDescriptor = selectModifierInfo(translationContext, 'result');
		const actionInfo = translationContext.actions.get(actionId);
		const actionIcon =
			actionInfo?.icon && actionInfo.icon.trim().length > 0
				? actionInfo.icon
				: (actionInfo?.name ?? actionDef.name ?? actionId);
		const targetLabel = formatTargetLabel(
			actionInfo?.icon ?? actionDef.icon ?? '',
			actionInfo?.name ?? actionDef.name ?? actionId,
		);
		const transferDescriptor = selectTransferDescriptor(translationContext);
		// Summary format: ✨🏴‍☠️: 🧺🔁 +10% Resource Transfer
		expect(summary).toEqual([
			`${resultDescriptor.icon}${actionIcon}: ${transferDescriptor.icon} +10% ${transferDescriptor.label}`,
		]);
		// Describe format: ✨🏴‍☠️ Plunder: 🧺🔁 +10% Resource Transfer + card
		const primaryLine = description[0];
		expect(primaryLine).toBe(
			`${resultDescriptor.icon}${targetLabel}: ${transferDescriptor.icon} +10% ${transferDescriptor.label}`,
		);
		const card = description[1];
		expect(card).toMatchObject({
			title: targetLabel,
			_hoist: true,
			_desc: true,
		});
	});

	it('throws error when modifier metadata is missing', () => {
		const { translationContext } = createModifierHarness({
			customizeMetadata(metadata) {
				if (metadata.assets) {
					delete metadata.assets.modifiers;
				}
			},
		});
		// Without proper modifier metadata, selectModifierInfo should throw
		expect(() => selectModifierInfo(translationContext, 'result')).toThrow(
			'Missing required content',
		);
	});
});

it('formats transfer amount evaluation modifiers for arbitrary actions', () => {
	const { translationContext, registries } = createModifierHarness();
	const { id: actionId, definition: actionDef } =
		selectActionWithIcon(registries);
	const eff: EffectDef = {
		type: 'result_mod',
		method: 'add',
		params: {
			id: 'synthetic:transfer-amount-bonus',
			evaluation: { type: 'transfer_amount', id: actionId },
			adjust: 2,
		},
	};
	const summary = summarizeEffects([eff], translationContext);
	const description = describeEffects([eff], translationContext);
	const resultDescriptor = selectModifierInfo(translationContext, 'result');
	const actionInfo = translationContext.actions.get(actionId);
	const actionIcon =
		actionInfo?.icon && actionInfo.icon.trim().length > 0
			? actionInfo.icon
			: (actionInfo?.name ?? actionDef.name ?? actionId);
	const targetLabel = formatTargetLabel(
		actionInfo?.icon ?? actionDef.icon ?? '',
		actionInfo?.name ?? actionDef.name ?? actionId,
	);
	const transferDescriptor = selectTransferDescriptor(translationContext);
	// Summary format: ✨🗡️: 🧺🔁 +2 Resource Transfer
	expect(summary).toEqual([
		`${resultDescriptor.icon}${actionIcon}: ${transferDescriptor.icon} +2 ${transferDescriptor.label}`,
	]);
	// Describe format: ✨🗡️ Raid: 🧺🔁 +2 Resource Transfer + card
	const primaryLine = description[0];
	expect(primaryLine).toBe(
		`${resultDescriptor.icon}${targetLabel}: ${transferDescriptor.icon} +2 ${transferDescriptor.label}`,
	);
	const card = description[1];
	expect(card).toMatchObject({
		title: targetLabel,
		_hoist: true,
		_desc: true,
	});
});
