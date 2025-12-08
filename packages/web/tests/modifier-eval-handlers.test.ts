import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { GENERAL_RESOURCE_ICON } from '../src/icons';
import { registerModifierEvalHandler } from '../src/translation/effects/formatters/modifier';
import { buildModifierDescriptionLabel } from '../src/translation/effects/formatters/modifier_helpers';
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
} from '../src/translation/effects/registrySelectors';
import { increaseOrDecrease } from '../src/translation/effects/helpers';

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
		const developmentInfo = translationContext.developments.get(developmentId);
		const targetIcon =
			developmentInfo?.icon && developmentInfo.icon.trim().length > 0
				? developmentInfo.icon
				: (developmentInfo?.name ?? developmentDef.name ?? developmentId);
		expect(summary).toHaveLength(1);
		expect(
			summary[0].startsWith(`${resultDescriptor.icon}${targetIcon}: `),
		).toBe(true);
		const resourceToken = resourceInfo.icon ?? resourceInfo.label ?? resourceId;
		expect(summary[0]).toContain(`${resourceToken}-2`);
		expect(description).not.toHaveLength(0);
		const primaryLine = description[0];
		const resultLabelText = buildModifierDescriptionLabel(resultDescriptor);
		const targetLabel = joinParts(
			developmentInfo?.icon ?? developmentDef.icon,
			developmentInfo?.name ?? developmentDef.name ?? developmentId,
		);
		expect(
			primaryLine.startsWith(`${resultLabelText} on ${targetLabel}:`),
		).toBe(true);
		expect(primaryLine.includes(resourceToken)).toBe(true);
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
		const actionInfo = translationContext.actions.get(actionId);
		const actionIcon =
			actionInfo?.icon && actionInfo.icon.trim().length > 0
				? actionInfo.icon
				: (actionInfo?.name ?? actionDef.name ?? actionId);
		const resourceIcon = resourceInfo.icon ?? resourceId;
		expect(summary).toEqual([
			`${costDescriptor.icon}${actionIcon}: ${resourceIcon}-20%`,
		]);
		const targetLabel = joinParts(
			actionInfo?.icon ?? actionDef.icon,
			actionInfo?.name ?? actionDef.name ?? actionId,
		);
		const costLabelText = buildModifierDescriptionLabel(costDescriptor);
		expect(description).toEqual([
			`${costLabelText} on ${targetLabel}: Decrease cost by 20% ${resourceIcon}`,
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
		const targetLabel = joinParts(
			actionInfo?.icon ?? actionDef.icon,
			actionInfo?.name ?? actionDef.name ?? actionId,
		);
		const transferDescriptor = selectTransferDescriptor(translationContext);
		const transferIcon = transferDescriptor.icon;
		const transferAdjust = Math.abs(Number(eff.params?.['adjust']));
		const transferChange = increaseOrDecrease(transferAdjust);
		expect(summary).toHaveLength(1);
		expect(
			summary[0].startsWith(`${resultDescriptor.icon}${actionIcon}: `),
		).toBe(true);
		expect(summary[0]).toMatch(/\+10%$/u);
		expect(summary[0]).toContain(
			`${GENERAL_RESOURCE_ICON} +${transferAdjust}%`,
		);
		const primaryLine = description[0];
		expect(
			primaryLine.startsWith(
				`${buildModifierDescriptionLabel(resultDescriptor)} on ${targetLabel}:`,
			),
		).toBe(true);
		expect(primaryLine).toMatch(/transfers.+10%/u);
		expect(primaryLine.toLowerCase()).toContain(
			`${transferIcon} ${transferChange.toLowerCase()} transfer by ${transferAdjust}%`,
		);
		const card = description[1];
		expect(card).toMatchObject({
			title: targetLabel,
			_hoist: true,
			_desc: true,
		});
	});

	it('falls back to default modifier descriptors when metadata is missing', () => {
		const { translationContext, registries } = createModifierHarness({
			customizeMetadata(metadata) {
				if (metadata.assets) {
					delete metadata.assets.modifiers;
				}
			},
		});
		const { id: actionId, definition: actionDef } =
			selectActionWithIcon(registries);
		const resultDescriptor = selectModifierInfo(translationContext, 'result');
		expect(resultDescriptor.icon).toBeTruthy();
		expect(resultDescriptor.label).toBeTruthy();
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				evaluation: { type: 'transfer_pct', id: actionId },
				adjust: 5,
			},
		};
		const summary = summarizeEffects([eff], translationContext);
		expect(summary[0].startsWith(resultDescriptor.icon)).toBe(true);
		const targetLabel = joinParts(
			translationContext.actions.get(actionId)?.icon ?? actionDef.icon,
			translationContext.actions.get(actionId)?.name ??
				actionDef.name ??
				actionId,
		);
		const primaryLine = describeEffects([eff], translationContext)[0];
		expect(
			primaryLine.startsWith(
				`${buildModifierDescriptionLabel(resultDescriptor)} on ${targetLabel}:`,
			),
		).toBe(true);
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
	const targetLabel = joinParts(
		actionInfo?.icon ?? actionDef.icon,
		actionInfo?.name ?? actionDef.name ?? actionId,
	);
	const transferDescriptor = selectTransferDescriptor(translationContext);
	const transferIcon = transferDescriptor.icon;
	expect(summary).toEqual([
		`${resultDescriptor.icon}${actionIcon}: ${transferIcon} +2`,
	]);
	const primaryLine = description[0];
	expect(
		primaryLine.startsWith(
			`${buildModifierDescriptionLabel(resultDescriptor)} on ${targetLabel}:`,
		),
	).toBe(true);
	expect(primaryLine.toLowerCase()).toContain(
		`${transferIcon} ${increaseOrDecrease(2).toLowerCase()} transfer by 2`,
	);
	const card = description[1];
	expect(card).toMatchObject({
		title: targetLabel,
		_hoist: true,
		_desc: true,
	});
});
