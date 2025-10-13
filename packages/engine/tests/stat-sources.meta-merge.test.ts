import { describe, it, expect } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { StatSourceMeta, StatSourceLink } from '../src/state/index.ts';
import { PopulationRole, Stat } from '@kingdom-builder/contents';
import { mergeMeta, extractMetaFromEffect } from '../src/stat_sources/meta.ts';
import {
	appendDependencyLink,
	cloneStatSourceLink,
	mergeLinkCollections,
	normalizeLink,
	normalizeLinks,
} from '../src/stat_sources/link_helpers.ts';

describe('stat source metadata merging', () => {
	it('preserves base metadata when no overrides are provided', () => {
		const baseMeta: StatSourceMeta = {
			key: 'base-source',
			longevity: 'ongoing',
			dependsOn: [{ type: 'population', id: PopulationRole.Legion }],
			extra: { origin: 'initial' },
		};
		const snapshot = structuredClone(baseMeta);
		mergeMeta(baseMeta);
		expect(baseMeta).toEqual(snapshot);
	});

	it('merges incoming metadata while respecting longevity and removal guards', () => {
		const baseMeta: StatSourceMeta = {
			key: 'base-source',
			longevity: 'ongoing',
			dependsOn: [{ type: 'population', id: PopulationRole.Legion }],
			removal: { type: 'phase', id: 'phase-alpha' },
			effect: { type: 'stat' },
			extra: { origin: 'initial' },
		};
		mergeMeta(baseMeta, {
			key: 'override-source',
			longevity: 'permanent',
			kind: 'role',
			id: 'meta-id',
			detail: 'detail-text',
			instance: '3',
			dependsOn: [
				{ type: 'population', id: PopulationRole.Legion },
				{ type: 'stat', id: Stat.growth },
			],
			removal: { type: 'phase', id: 'phase-beta' },
			effect: { method: 'set' },
			extra: {},
		});
		expect(baseMeta.key).toBe('override-source');
		expect(baseMeta.longevity).toBe('ongoing');
		expect(baseMeta.kind).toBe('role');
		expect(baseMeta.id).toBe('meta-id');
		expect(baseMeta.detail).toBe('detail-text');
		expect(baseMeta.instance).toBe('3');
		expect(baseMeta.removal).toEqual({ type: 'phase', id: 'phase-alpha' });
		expect(baseMeta.effect).toEqual({ type: 'stat', method: 'set' });
		expect(baseMeta.dependsOn).toEqual([
			{ type: 'population', id: PopulationRole.Legion },
			{ type: 'stat', id: Stat.growth },
		]);
		expect(baseMeta.extra).toEqual({ origin: 'initial' });
		mergeMeta(baseMeta, {
			longevity: 'ongoing',
			extra: { update: 'applied' },
		});
		expect(baseMeta.longevity).toBe('ongoing');
		expect(baseMeta.extra).toEqual({ origin: 'initial', update: 'applied' });
	});

	it('adds removal links and dependencies when the base metadata lacks them', () => {
		const baseMeta: StatSourceMeta = {
			key: 'secondary',
			longevity: 'permanent',
		};
		const dependencies: StatSourceLink[] = [
			{ type: 'stat', id: Stat.armyStrength },
			{ type: 'stat', id: Stat.armyStrength },
		];
		mergeMeta(baseMeta, {
			dependsOn: dependencies,
			removal: {
				type: 'population',
				id: PopulationRole.Council,
				detail: 'assignment',
			},
			extra: { reason: 'bonus' },
		});
		expect(baseMeta.dependsOn).toEqual([
			{ type: 'stat', id: Stat.armyStrength },
		]);
		expect(baseMeta.removal).toEqual({
			type: 'population',
			id: PopulationRole.Council,
			detail: 'assignment',
		});
		expect(baseMeta.extra).toEqual({ reason: 'bonus' });
	});
	it('extracts metadata from effect definitions with fallbacks', () => {
		const effectWithMeta = {
			type: 'stat',
			method: 'add',
			meta: {
				statSource: {
					key: ' custom-source ',
					longevity: 'ongoing',
					kind: ' role ',
					id: ' identifier ',
					detail: ' detail ',
					instance: 5,
					dependsOn: { type: 'population', id: ` ${PopulationRole.Legion} ` },
					removal: { type: 'phase', id: 'phase-id', detail: ' cleanup ' },
					extraKey: 'value',
				},
			},
		} satisfies EffectDef;
		const extracted = extractMetaFromEffect(effectWithMeta, Stat.armyStrength);
		expect(extracted).toMatchObject({
			key: 'custom-source',
			longevity: 'ongoing',
			kind: 'role',
			id: 'identifier',
			detail: 'detail',
			instance: '5',
			effect: { type: 'stat', method: 'add' },
		});
		expect(extracted?.dependsOn).toEqual([
			{ type: 'population', id: PopulationRole.Legion },
		]);
		expect(extracted?.removal).toEqual({
			type: 'phase',
			id: 'phase-id',
			detail: 'cleanup',
		});
		expect(extracted?.extra).toEqual({ extraKey: 'value' });
		const fallback = extractMetaFromEffect(
			{ type: 'resource', method: 'add', meta: { statSource: {} } },
			Stat.growth,
		);
		expect(fallback).toMatchObject({
			key: 'resource:add:'.concat(Stat.growth),
			longevity: 'permanent',
			effect: { type: 'resource', method: 'add' },
		});
		const missing = extractMetaFromEffect(
			{ type: 'stat', method: 'add' },
			Stat.growth,
		);
		expect(missing).toBeUndefined();
	});

	it('normalizes and merges stat source links consistently', () => {
		const baseLinks = [{ type: 'population', id: PopulationRole.Legion }];
		const incomingLinks = [
			{ type: 'population', id: PopulationRole.Legion, detail: 'existing' },
			{ type: 'stat', id: Stat.armyStrength },
		];
		const merged = mergeLinkCollections(baseLinks, incomingLinks);
		expect(merged).toEqual([
			{ type: 'population', id: PopulationRole.Legion },
			{
				type: 'population',
				id: PopulationRole.Legion,
				detail: 'existing',
			},
			{ type: 'stat', id: Stat.armyStrength },
		]);
		const meta: StatSourceMeta = { key: 'link-test', longevity: 'permanent' };
		appendDependencyLink(meta, { type: 'stat', id: Stat.armyStrength });
		appendDependencyLink(meta, { type: 'stat', id: Stat.armyStrength });
		expect(meta.dependsOn).toEqual([{ type: 'stat', id: Stat.armyStrength }]);
		const normalized = normalizeLink({
			type: ' stat ',
			id: ` ${Stat.growth} `,
			detail: ' delta ',
			extraKey: 7,
		});
		expect(normalized).toEqual({
			type: 'stat',
			id: Stat.growth,
			detail: 'delta',
			extra: { extraKey: 7 },
		});
		expect(normalizeLink(null)).toBeUndefined();
		expect(
			normalizeLinks([{ type: 'population', id: PopulationRole.Legion }, null]),
		).toEqual([{ type: 'population', id: PopulationRole.Legion }]);
		const cloned = cloneStatSourceLink({
			type: 'population',
			id: PopulationRole.Council,
			extra: { reason: 'sync' },
		});
		expect(cloned).toEqual({
			type: 'population',
			id: PopulationRole.Council,
			extra: { reason: 'sync' },
		});
	});
});
