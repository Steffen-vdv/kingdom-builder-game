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

const collectSummaryLines = (entry: unknown): string[] => {
	if (typeof entry === 'string') return [entry];
	if (!entry || typeof entry !== 'object') return [];
	const record = entry as { title?: unknown; items?: unknown[] };
	const lines: string[] = [];
	if (typeof record.title === 'string' && record.title.trim())
		lines.push(record.title);
	if (Array.isArray(record.items))
		record.items.forEach((item) => {
			collectSummaryLines(item).forEach((line) => lines.push(line));
		});
	return lines;
};

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
		const [populationId, populationRole] = Object.entries(POPULATION_ROLES)[0]!;
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
		const resource = RESOURCES[resourceKey as keyof typeof RESOURCES];
		const triggerId = Object.keys(TRIGGER_INFO)[0]!;
		const triggerInfo = TRIGGER_INFO[triggerId as keyof typeof TRIGGER_INFO];
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
			{ type: 'land', id: landId },
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
		const breakdown = getStatBreakdownSummary(primaryStatKey, player, ctx);
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
		if (populationRole.icon)
			expect(populationLine).toContain(populationRole.icon);
		expect(populationLine).toContain(populationRole.label ?? populationId);
		expect(populationLine).toContain(`×${player.population[populationId]}`);
		if (building.icon) expect(buildingLine).toContain(building.icon);
		expect(buildingLine).toContain(building.name ?? buildingId);
		if (development.icon) expect(developmentLine).toContain(development.icon);
		expect(developmentLine).toContain(development.name ?? developmentId);
		const phaseParts: string[] = [];
		if (phaseWithStep!.icon) phaseParts.push(phaseWithStep!.icon);
		if (phaseWithStep!.label) phaseParts.push(phaseWithStep!.label);
		const phaseText = phaseParts.join(' ').trim();
		const stepParts: string[] = [];
		if (step!.icon) stepParts.push(step!.icon);
		const stepLabel = step!.title ?? step!.id;
		if (stepLabel) stepParts.push(stepLabel);
		const stepText = stepParts.join(' ').trim();
		const expectedPhaseText = stepText
			? phaseText
				? `${phaseText} · ${stepText}`
				: stepText
			: phaseText;
		if (expectedPhaseText) expect(phaseLine).toContain(expectedPhaseText);
		if (action.icon) expect(actionLine).toContain(action.icon);
		expect(actionLine).toContain(action.name ?? actionId);
		const statInfo = STATS[secondaryStatKey as keyof typeof STATS];
		if (statInfo?.icon) expect(statLine).toContain(statInfo.icon);
		expect(statLine).toContain(statInfo?.label ?? secondaryStatKey);
		expect(statLine).toContain(
			formatStatValue(secondaryStatKey, player.stats[secondaryStatKey]!),
		);
		if (resource?.icon) expect(resourceLine).toContain(resource.icon);
		expect(resourceLine).toContain(resource?.label ?? resourceKey);
		const formatDetail = (detail: string) =>
			detail
				.split('-')
				.filter((segment) => segment.length)
				.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
				.join(' ');
		expect(resourceLine).toContain(formatDetail(resourceDetail));
		if (triggerInfo?.icon) expect(triggerLine).toContain(triggerInfo.icon);
		expect(triggerLine).toContain(
			triggerInfo?.past ?? triggerInfo?.future ?? triggerId,
		);
		if (PASSIVE_INFO.icon) expect(passiveLine).toContain(PASSIVE_INFO.icon);
		expect(passiveLine).toContain(PASSIVE_INFO.label);
		expect(landLine).toContain(String(landId));
		expect(startLine).toContain('Initial Setup');
		expect(unknownLine).toContain(unknownId);
		expect(unknownLine).toContain(formatDetail(unknownDetail));
	});
});
