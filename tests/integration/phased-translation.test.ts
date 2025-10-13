import { describe, it, expect } from 'vitest';

import { createEngine } from '@kingdom-builder/engine';
import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
import type { PhasedDef } from '@kingdom-builder/web/translation/content/phased';
import type {
	DevelopmentConfig,
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { SessionTriggerMetadata } from '@kingdom-builder/protocol/session';
import {
	createTranslationContext,
	type TranslationContext,
} from '@kingdom-builder/web/translation/context';
import { snapshotEngine } from '../../packages/engine/src/runtime/engine_snapshot';
import { createSessionRegistries } from '../../packages/web/tests/helpers/sessionRegistries';
import { formatDetailText } from '../../packages/web/src/utils/stats/format';

type Entry = string | { title: string; items: Entry[] };

function findEntry(
	entries: Entry[],
	title: string,
): { title: string; items: Entry[] } | undefined {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			continue;
		}
		if (entry.title === title) {
			return entry;
		}
		const nested = findEntry(entry.items, title);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

function formatStepTriggerLabel(
	ctx: TranslationContext,
	triggerKey: string,
): string | undefined {
	for (const phase of ctx.phases) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			if (!triggers.includes(triggerKey)) {
				continue;
			}
			const phaseLabelParts = [
				phase.icon,
				phase.label ?? formatDetailText(phase.id),
			]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			const stepLabelParts = (step.title ?? formatDetailText(step.id))
				?.trim()
				.replace(/\s+/gu, ' ');
			const sections: string[] = [];
			if (phaseLabelParts.length) {
				sections.push(`${phaseLabelParts} Phase`);
			}
			if (stepLabelParts && stepLabelParts.length) {
				sections.push(`${stepLabelParts} step`);
			}
			if (!sections.length) {
				return undefined;
			}
			return sections.join(' — ');
		}
	}
	return undefined;
}

describe('PhasedTranslator step triggers', () => {
	it('renders dynamic step metadata from trigger descriptors', () => {
		const registries = createSessionRegistries();
		const development: DevelopmentConfig = {
			id: 'development.trigger.test',
			name: 'Trigger Test Development',
			onBuild: [],
			onGrowthPhase: [],
			onBeforeAttacked: [],
			onAttackResolved: [],
			onPayUpkeepStep: [],
			onGainIncomeStep: [],
			onGainAPStep: [],
		};
		registries.developments.add(development.id, development);

		const resourceKeys = Object.keys(registries.resources);
		if (!resourceKeys.length) {
			throw new Error('No resources available in session registries payload.');
		}
		const resourceKey = resourceKeys[0];
		const growthPhaseId = 'phase.synthetic.growth';
		const upkeepPhaseId = 'phase.synthetic.upkeep';
		const phases: PhaseConfig[] = [
			{
				id: growthPhaseId,
				label: 'Growth',
				icon: '🌱',
				steps: [
					{
						id: 'gainIncome',
						title: 'Gain Income',
						triggers: ['onGainIncomeStep'],
					},
					{
						id: 'gainAP',
						title: 'Gain Action Points',
						triggers: ['onGainAPStep'],
					},
				],
			},
			{
				id: upkeepPhaseId,
				label: 'Upkeep',
				icon: '🧹',
				steps: [
					{
						id: 'payUpkeep',
						title: 'Pay Upkeep',
						triggers: ['onPayUpkeepStep'],
					},
				],
			},
		];
		const start: StartConfig = {
			player: {
				resources: { [resourceKey]: 0 },
				stats: {},
				population: {},
				lands: [],
			},
		};
		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 1,
			absorptionRounding: 'down',
			tieredResourceKey: resourceKey,
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 1,
			winConditions: [],
			corePhaseIds: { growth: growthPhaseId, upkeep: upkeepPhaseId },
		};

		const ctx = createEngine({
			actions: registries.actions,
			buildings: registries.buildings,
			developments: registries.developments,
			populations: registries.populations,
			phases,
			start,
			rules,
		});
		const snapshot = snapshotEngine(ctx);
		const stored = registries.developments.get(
			development.id,
		) as unknown as PhasedDef;
		const makeEffect = (amount: number) => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount },
		});
		const triggerMetadata: Record<string, SessionTriggerMetadata> = {
			onGainIncomeStep: {
				icon: '💰',
				future: 'During Growth Phase — Gain Income step',
				past: 'Growth Phase — Gain Income step',
			},
			onPayUpkeepStep: {
				icon: '🧹',
				future: 'During Upkeep Phase — Pay Upkeep step',
				past: 'Upkeep Phase — Pay Upkeep step',
			},
			onGainAPStep: {
				icon: '⚡',
				future: 'During action point step',
				past: 'Action point step',
			},
			onTestStep: {
				icon: '🧪',
				future: 'During test step',
				past: 'Test step',
			},
		};
		const stepKeys = Object.keys(triggerMetadata).filter((key) =>
			key.endsWith('Step'),
		);
		stepKeys.forEach((key, index) => {
			stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
		});
		const metadata = {
			...snapshot.metadata,
			triggers: {
				...(snapshot.metadata.triggers ?? {}),
				...triggerMetadata,
			},
			phases: {
				[growthPhaseId]: { icon: '🌱', label: 'Growth' },
				[upkeepPhaseId]: { icon: '🧹', label: 'Upkeep' },
			},
		};
		const translation = createTranslationContext(
			{ ...snapshot, metadata },
			registries,
			metadata,
			{
				ruleSnapshot: snapshot.rules,
				passiveRecords: snapshot.passiveRecords,
			},
		);

		const summary = summarizeContent(
			'development',
			development.id,
			translation,
		) as unknown as Entry[];
		const details = describeContent(
			'development',
			development.id,
			translation,
		) as unknown as Entry[];
		for (const key of stepKeys) {
			const info = translation.assets.triggers[key];
			const expectedTitle = [info?.icon, info?.future]
				.filter(Boolean)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(translation, key);
			const resolvedTitle = stepLabel
				? [info?.icon, `During ${stepLabel}`].filter(Boolean).join(' ').trim()
				: expectedTitle;
			const summaryEntry =
				findEntry(summary, resolvedTitle) ?? findEntry(summary, expectedTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();
			const describeEntry =
				findEntry(details, resolvedTitle) ?? findEntry(details, expectedTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
		}
	});
});
