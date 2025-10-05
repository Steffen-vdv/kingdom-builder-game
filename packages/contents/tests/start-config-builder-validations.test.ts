import { describe, expect, it } from 'vitest';
import { startConfig, playerStart } from '../src/config/builders';
import { RESOURCES, type ResourceKey } from '../src/resources';
import { STATS, type StatKey } from '../src/stats';

const firstResourceKey = Object.keys(RESOURCES)[0] as ResourceKey;
const firstStatKey = Object.keys(STATS)[0] as StatKey;

describe('start config builder safeguards', () => {
	it('requires player start to configure each section', () => {
		expect(() =>
			playerStart()
				.stats({ [firstStatKey]: 0 })
				.population({ demo: 0 })
				.lands([])
				.build(),
		).toThrowError(
			'Player start is missing resources(). Call resources(...) before build().',
		);
	});

	it('prevents duplicate player start resource setters', () => {
		expect(() =>
			playerStart()
				.resources({ [firstResourceKey]: 1 })
				.resources({ [firstResourceKey]: 2 }),
		).toThrowError(
			'Player start already set resources(). Remove the extra resources() call.',
		);
	});

	it('demands a base player when building start configs', () => {
		expect(() => startConfig().build()).toThrowError(
			'Start config is missing player(...). Configure the base player first.',
		);
	});

	it('rejects duplicate player registrations in start configs', () => {
		expect(() =>
			startConfig()
				.player(
					playerStart()
						.resources({
							[firstResourceKey]: 1,
						})
						.stats({ [firstStatKey]: 1 })
						.population({ demo: 1 })
						.lands([]),
				)
				.player(
					playerStart()
						.resources({
							[firstResourceKey]: 1,
						})
						.stats({ [firstStatKey]: 1 })
						.population({ demo: 1 })
						.lands([]),
				),
		).toThrowError(
			'Start config already set player(...). Remove the extra player() call.',
		);
	});

	it('supports configuring lands through builder helpers', () => {
		const config = playerStart()
			.resources({ [firstResourceKey]: 1 })
			.stats({ [firstStatKey]: 2 })
			.population({ demo: 3 })
			.lands((lands) =>
				lands
					.land((land) =>
						land.development('demo-development').slotsMax(2).slotsUsed(1),
					)
					.land(),
			)
			.build();
		expect(config.lands).toEqual([
			{
				developments: ['demo-development'],
				slotsMax: 2,
				slotsUsed: 1,
			},
			{},
		]);
	});

	it('blocks duplicate last player compensations in start configs', () => {
		expect(() =>
			startConfig()
				.player(
					playerStart()
						.resources({
							[firstResourceKey]: 1,
						})
						.stats({ [firstStatKey]: 1 })
						.population({ demo: 1 })
						.lands([]),
				)
				.lastPlayerCompensation((player) =>
					player.resources({
						[firstResourceKey]: 0,
					}),
				)
				.lastPlayerCompensation((player) =>
					player.resources({
						[firstResourceKey]: 0,
					}),
				),
		).toThrowError(
			'Start config already set lastPlayerCompensation(). Remove the extra call.',
		);
	});
});
