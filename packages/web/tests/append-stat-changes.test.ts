import { describe, expect, it } from 'vitest';
import {
	PopulationRole,
	POPULATION_ROLES,
	Stat,
	STATS,
} from '@kingdom-builder/contents';
import { appendStatChanges } from '../src/translation/log/diffSections';
import { type PlayerSnapshot } from '../src/translation/log';
import { type StepEffects } from '../src/translation/log/statBreakdown';
import { formatPercentBreakdown } from '../src/translation/log/diffFormatting';
import { formatStatValue } from '../src/utils/stats';

describe('appendStatChanges', () => {
	it('uses the provided player snapshot for percent breakdowns', () => {
		const before: PlayerSnapshot = {
			resources: {},
			stats: {
				[Stat.armyStrength]: 4,
				[Stat.growth]: 20,
			},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const after: PlayerSnapshot = {
			resources: {},
			stats: {
				[Stat.armyStrength]: 5,
				[Stat.growth]: 20,
			},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const player: PlayerSnapshot = {
			resources: {},
			stats: {
				[Stat.armyStrength]: 5,
				[Stat.growth]: 25,
			},
			population: {
				[PopulationRole.Legion]: 2,
			},
			buildings: [],
			lands: [],
			passives: [],
		};
		const raiseStrengthEffects: StepEffects = {
			effects: [
				{
					evaluator: {
						type: 'population',
						params: { role: PopulationRole.Legion },
					},
					effects: [
						{
							type: 'stat',
							method: 'add_pct',
							params: {
								key: Stat.armyStrength,
								percentStat: Stat.growth,
							},
						},
					],
				},
			],
		};
		const changes: string[] = [];
		appendStatChanges(changes, before, after, player, raiseStrengthEffects);
		const label = STATS[Stat.armyStrength]?.label ?? Stat.armyStrength;
		const line = changes.find((entry) => entry.includes(label));
		expect(line).toBeDefined();
		const legionIcon = POPULATION_ROLES[PopulationRole.Legion]?.icon || '';
		const growthIcon = STATS[Stat.growth]?.icon || '';
		const armyIcon = STATS[Stat.armyStrength]?.icon || '';
		const breakdown = formatPercentBreakdown(
			armyIcon || '',
			formatStatValue(Stat.armyStrength, before.stats[Stat.armyStrength]),
			legionIcon,
			player.population[PopulationRole.Legion] ?? 0,
			growthIcon,
			formatStatValue(Stat.growth, player.stats[Stat.growth]),
			formatStatValue(Stat.armyStrength, after.stats[Stat.armyStrength]),
		);
		expect(line?.endsWith(breakdown)).toBe(true);
	});
});
