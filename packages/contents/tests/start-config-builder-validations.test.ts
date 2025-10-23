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
		).toThrowError('Player start is missing resources(). Call resources(...) before build().');
	});

	it('prevents duplicate player start resource setters', () => {
		expect(() =>
			playerStart()
				.resources({ [firstResourceKey]: 1 })
				.resources({ [firstResourceKey]: 2 }),
		).toThrowError('Player start already set resources(). Remove the extra resources() call.');
	});

	it('demands a base player when building start configs', () => {
		expect(() => startConfig().build()).toThrowError('Start config is missing player(...). Configure the base player first.');
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
		).toThrowError('Start config already set player(...). Remove the extra player() call.');
	});

	it('supports configuring lands through builder helpers', () => {
		const config = playerStart()
			.resources({ [firstResourceKey]: 1 })
			.stats({ [firstStatKey]: 2 })
			.population({ demo: 3 })
			.lands((lands) => lands.land((land) => land.development('demo-development').slotsMax(2).slotsUsed(1)).land())
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

	it('mirrors legacy resources into ResourceV2 values by default', () => {
		const config = playerStart()
			.resources({
				[firstResourceKey]: 4,
			})
			.stats({ [firstStatKey]: 1 })
			.population({ demo: 0 })
			.lands([])
			.build();
		expect(config.valuesV2).toEqual({
			[firstResourceKey]: 4,
		});
	});

	it('supports configuring ResourceV2 bounds', () => {
		const lower = { [firstResourceKey]: 0 };
		const upper = { [firstResourceKey]: 5 };
		const config = playerStart()
			.resources({ [firstResourceKey]: 1 })
			.stats({ [firstStatKey]: 2 })
			.population({ demo: 3 })
			.resourceBoundsV2({ lower, upper })
			.lands([])
			.build();
		expect(config.resourceLowerBoundsV2).toEqual(lower);
		expect(config.resourceUpperBoundsV2).toEqual(upper);
	});

	it('rejects duplicate ResourceV2 bound setters', () => {
		expect(() =>
			playerStart({ requireComplete: false })
				.resourceBoundsV2({
					lower: {
						[firstResourceKey]: 0,
					},
				})
				.resourceBoundsV2({
					lower: {
						[firstResourceKey]: 1,
					},
				}),
		).toThrowError('Player start already set resourceBoundsV2(). Remove the extra resourceBoundsV2() call.');
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
		).toThrowError('Start config already set lastPlayerCompensation(). Remove the extra call.');
	});

	it('rejects duplicate dev mode configurations in start configs', () => {
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
				.devMode((mode) => mode)
				.devMode((mode) => mode),
		).toThrowError('Start config already set devMode(...). Remove the extra call.');
	});

	it('requires dev mode callbacks to return the provided builder', () => {
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
				.devMode(() => {
					return {} as unknown as ReturnType<typeof startConfig>;
				}),
		).toThrowError('Start config devMode(...) callback must return the provided builder.');
	});
});
