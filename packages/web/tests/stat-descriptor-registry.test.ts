import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	type StatKey,
	type StatSourceLink,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATION_ROLES,
	POPULATIONS,
	PHASES,
	RESOURCES,
	GAME_START,
	RULES,
	STATS,
	TRIGGER_INFO,
	PASSIVE_INFO,
} from '@kingdom-builder/contents';
import { getStatBreakdownSummary, formatStatValue } from '../src/utils/stats';
import type {
	TranslationAssets,
	TranslationContext,
} from '../src/translation/context';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from './helpers/translationContextStub';

const collectSummaryLines = (entry: unknown): string[] => {
	if (typeof entry === 'string') {
		return [entry];
	}
	if (!entry || typeof entry !== 'object') {
		return [];
	}
	const record = entry as { title?: unknown; items?: unknown[] };
	const lines: string[] = [];
	if (typeof record.title === 'string' && record.title.trim()) {
		lines.push(record.title);
	}
	if (Array.isArray(record.items)) {
		record.items.forEach((item) => {
			collectSummaryLines(item).forEach((line) => lines.push(line));
		});
	}
	return lines;
};

function buildDescriptorAssets(): TranslationAssets {
	const stats = Object.fromEntries(
		Object.entries(STATS).map(([key, info]) => [
			key,
			{
				icon: info.icon,
				label: info.label ?? info.name ?? key,
				description: info.description,
			},
		]),
	);
	const populations = Object.fromEntries(
		Object.entries(POPULATION_ROLES).map(([id, definition]) => [
			id,
			{
				icon: definition.icon,
				label: definition.label ?? definition.name ?? id,
			},
		]),
	);
	const resources = Object.fromEntries(
		Object.entries(RESOURCES).map(([id, definition]) => [
			id,
			{
				icon: definition.icon,
				label: definition.label ?? id,
				description: definition.description,
			},
		]),
	);
	const triggers = Object.fromEntries(
		Object.entries(TRIGGER_INFO).map(([id, info]) => [
			id,
			{
				icon: info.icon,
				future: info.future,
				past: info.past,
			},
		]),
	);
	return {
		resources,
		stats,
		populations,
		population: { icon: '👥', label: 'Population' },
		land: { icon: '', label: 'Land' },
		slot: { icon: '', label: 'Development Slot' },
		passive: { icon: PASSIVE_INFO.icon, label: PASSIVE_INFO.label },
		triggers,
		modifiers: {},
		formatPassiveRemoval: (description) => `Active as long as ${description}`,
	} satisfies TranslationAssets;
}

function createDescriptorContext(
	engineContext: ReturnType<typeof createEngine>,
): TranslationContext {
	const assets = buildDescriptorAssets();
	const wrap = <T>(registry: {
		get(id: string): T;
		has(id: string): boolean;
	}) =>
		wrapTranslationRegistry({
			get(id: string) {
				return registry.get(id);
			},
			has(id: string) {
				return registry.has(id);
			},
		});
	const phases = engineContext.phases.map((phase) => ({
		id: phase.id,
		icon: phase.icon,
		label: phase.label,
		steps: phase.steps?.map((step) => ({
			id: step.id,
			icon: step.icon,
			title: step.title,
			triggers: step.triggers ? [...step.triggers] : undefined,
		})),
	}));
	const buildPlayer = (player: typeof engineContext.activePlayer) =>
		toTranslationPlayer({
			id: player.id,
			name: player.name,
			resources: player.resources,
			population: player.population,
			stats: player.stats,
		});
	return createTranslationContextStub({
		phases,
		actionCostResource: engineContext.actionCostResource ?? '',
		actions: wrap(engineContext.actions),
		buildings: wrap(engineContext.buildings),
		developments: wrap(engineContext.developments),
		populations: wrap(engineContext.populations),
		activePlayer: buildPlayer(engineContext.activePlayer),
		opponent: buildPlayer(engineContext.opponent),
		rules: engineContext.rules,
		assets,
	});
}

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('stat descriptor registry', () => {
	it('formats dependencies for each descriptor kind', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const player = ctx.activePlayer;
		const statKeys = Object.keys(STATS) as StatKey[];
		expect(statKeys.length).toBeGreaterThan(0);
		const [primaryStatKey, secondaryStatKey = statKeys[0]!] = statKeys;
		const [populationId] = Object.entries(POPULATION_ROLES)[0]!;
		player.population[populationId] = 2;
		const buildingId = BUILDINGS.keys()[0]!;
		const building = BUILDINGS.get(buildingId);
		const developmentId = DEVELOPMENTS.keys()[0]!;
		const development = DEVELOPMENTS.get(developmentId);
		const phaseWithStep = PHASES.find((phase) => phase.steps?.length);
		expect(phaseWithStep).toBeDefined();
		const step = phaseWithStep!.steps.find((entry) => entry.id);
		expect(step).toBeDefined();
		const actionId = ACTIONS.keys()[0]!;
		const action = ACTIONS.get(actionId);
		const resourceKey = Object.keys(RESOURCES)[0]!;
		const triggerId = Object.keys(TRIGGER_INFO)[0]!;
		const landId = player.lands[0]?.id;
		expect(landId).toBeDefined();
		const unknownId = 'mystery-source';
		const resourceDetail = 'resource-detail';
		const unknownDetail = 'mystery-detail';
		player.stats[secondaryStatKey] = 3;
		const dependencies: StatSourceLink[] = [
			{ type: 'population', id: populationId },
			{ type: 'building', id: buildingId },
			{ type: 'development', id: developmentId },
			{ type: 'phase', id: phaseWithStep!.id, detail: step!.id },
			{ type: 'action', id: actionId },
			{ type: 'stat', id: secondaryStatKey },
			{ type: 'resource', id: resourceKey, detail: resourceDetail },
			{ type: 'trigger', id: triggerId },
			{ type: 'passive' },
			{ type: 'land', id: landId, detail: landId },
			{ type: 'start' },
			{ type: 'mystery', id: unknownId, detail: unknownDetail },
		];
		player.statSources[primaryStatKey] = {
			descriptor: {
				amount: 1,
				meta: {
					key: primaryStatKey,
					longevity: 'permanent',
					kind: 'action',
					id: actionId,
					dependsOn: dependencies,
				},
			},
		};
		const translationContext = createDescriptorContext(ctx);
		const breakdown = getStatBreakdownSummary(
			primaryStatKey,
			player,
			translationContext,
		);
		const triggered = breakdown
			.flatMap((entry) => collectSummaryLines(entry))
			.filter((line) => line.startsWith('Triggered by'));
		expect(triggered).toHaveLength(dependencies.length);
		const [
			populationLine,
			buildingLine,
			developmentLine,
			phaseLine,
			actionLine,
			statLine,
			resourceLine,
			triggerLine,
			passiveLine,
			landLine,
			startLine,
			unknownLine,
		] = triggered;
		const populationAsset = translationContext.assets.populations[populationId];
		if (populationAsset?.icon) {
			expect(populationLine).toContain(populationAsset.icon);
		}
		expect(populationLine).toContain(populationAsset?.label ?? populationId);
		expect(populationLine).toContain(`×${player.population[populationId]}`);
		if (building.icon) {
			expect(buildingLine).toContain(building.icon);
		}
		expect(buildingLine).toContain(building.name ?? buildingId);
		if (development.icon) {
			expect(developmentLine).toContain(development.icon);
		}
		expect(developmentLine).toContain(development.name ?? developmentId);
		const phaseParts: string[] = [];
		if (phaseWithStep!.icon) {
			phaseParts.push(phaseWithStep!.icon);
		}
		if (phaseWithStep!.label) {
			phaseParts.push(phaseWithStep!.label);
		}
		const phaseText = phaseParts.join(' ').trim();
		const stepParts: string[] = [];
		if (step!.icon) {
			stepParts.push(step!.icon);
		}
		const stepLabel = step!.title ?? step!.id;
		if (stepLabel) {
			stepParts.push(stepLabel);
		}
		const stepText = stepParts.join(' ').trim();
		const expectedPhaseText = stepText
			? phaseText
				? `${phaseText} · ${stepText}`
				: stepText
			: phaseText;
		if (expectedPhaseText) {
			expect(phaseLine).toContain(expectedPhaseText);
		}
		if (action.icon) {
			expect(actionLine).toContain(action.icon);
		}
		expect(actionLine).toContain(action.name ?? actionId);
		const statInfo = STATS[secondaryStatKey as keyof typeof STATS];
		if (statInfo?.icon) {
			expect(statLine).toContain(statInfo.icon);
		}
		expect(statLine).toContain(statInfo?.label ?? secondaryStatKey);
		expect(statLine).toContain(
			formatStatValue(secondaryStatKey, player.stats[secondaryStatKey]!),
		);
		const resourceAsset = translationContext.assets.resources[resourceKey];
		if (resourceAsset?.icon) {
			expect(resourceLine).toContain(resourceAsset.icon);
		}
		expect(resourceLine).toContain(resourceAsset?.label ?? resourceKey);
		const formatDetail = (detail: string) =>
			detail
				.split('-')
				.filter((segment) => segment.length)
				.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
				.join(' ');
		expect(resourceLine).toContain(formatDetail(resourceDetail));
		const triggerAsset = translationContext.assets.triggers?.[triggerId];
		if (triggerAsset?.icon) {
			expect(triggerLine).toContain(triggerAsset.icon);
		}
		expect(triggerLine).toContain(
			triggerAsset?.past ?? triggerAsset?.future ?? triggerId,
		);
		if (translationContext.assets.passive.icon) {
			expect(passiveLine).toContain(translationContext.assets.passive.icon);
		}
		expect(passiveLine).toContain(translationContext.assets.passive.label);
		expect(landLine).toContain(String(landId));
		expect(startLine).toContain('Initial Setup');
		expect(unknownLine).toContain(unknownId);
		expect(unknownLine).toContain(formatDetail(unknownDetail));
	});
});
