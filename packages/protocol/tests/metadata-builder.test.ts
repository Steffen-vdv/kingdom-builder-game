import { describe, expect, it } from 'vitest';
import {
	buildSessionSnapshotMetadata,
	type BuildSessionSnapshotMetadataOptions,
	type MetadataContentSources,
	type MetadataRegistrySources,
} from '../src/session/metadataBuilder';
import type { OverviewContentTemplate } from '../src/session/overview';

const createOverviewTemplate = (): OverviewContentTemplate => ({
	hero: {
		badgeIcon: '👑',
		badgeLabel: 'Crown',
		title: 'Kingdom Overview',
		intro: 'Intro text',
		paragraph: 'Body {game}',
		tokens: {
			game: 'Game',
			invalid: 42 as unknown as string,
		},
	},
	sections: [
		{
			kind: 'paragraph',
			id: 'objective',
			icon: 'info',
			title: 'Objective',
			paragraphs: ['Win', { text: 'skip' } as unknown as string],
		},
		{
			kind: 'list',
			id: 'resources',
			icon: 'gold',
			title: 'Resources',
			items: [
				{
					icon: 'gold',
					label: 'Gold',
					body: ['Spend wisely', (() => 'fn') as unknown as string],
				},
			],
		},
	],
	tokens: {
		resources: {
			gold: ['gold', 7 as unknown as string],
		},
		static: {
			odd: [{} as unknown as string],
		},
	},
});

const createBuilderOptions = (
	passiveEvaluationModifiers?: BuildSessionSnapshotMetadataOptions['passiveEvaluationModifiers'],
) => {
	const registries: MetadataRegistrySources = {
		populations: {
			council: {
				name: 'Council',
				icon: '🎓',
				description: 'Leads the realm',
			},
		},
		buildings: {
			keep: { name: 'Keep', icon: '🏰' },
		},
		developments: {
			farm: { name: 'Farm', description: 'Grows food' },
		},
	};
	const overview = createOverviewTemplate();
	const content: MetadataContentSources = {
		resources: {
			gold: { label: 'Gold', icon: '🪙', description: 'Currency' },
		},
		stats: {
			happiness: { label: 'Happiness', icon: '😊' },
		},
		phases: [
			{
				id: 'growth',
				label: 'Growth',
				icon: '🌱',
				action: false,
				steps: [
					{
						id: 'collect',
						title: 'Collect',
						icon: '🧺',
						triggers: ['onGrowthPhase'],
					},
				],
			},
		],
		triggers: {
			onGrowthPhase: {
				past: 'Growth Phase',
				future: 'During Growth Phase',
				icon: '🌿',
			},
		},
		assets: {
			land: { label: 'Land', icon: '🗺️' },
			custom: {
				inner: { label: 'Inner', description: 'Nested' },
			},
		},
		overview,
	};
	return {
		registries,
		content,
		overview,
		passiveEvaluationModifiers,
	};
};

describe('buildSessionSnapshotMetadata', () => {
	it('includes overview metadata and clones inputs', () => {
		const { registries, content, overview } = createBuilderOptions();
		const metadata = buildSessionSnapshotMetadata({
			registries,
			content,
		});
		expect(metadata.overview).toBeDefined();
		const builtOverview = metadata.overview;
		expect(builtOverview?.hero.tokens).toEqual({ game: 'Game' });
		expect(builtOverview?.sections[0].paragraphs).toEqual(['Win']);
		expect(builtOverview?.sections[1].items[0].body).toEqual(['Spend wisely']);
		expect(builtOverview?.tokens.resources?.gold).toEqual(['gold']);
		expect(builtOverview?.tokens.static?.odd).toEqual([]);
		expect(builtOverview).not.toBe(overview);
		expect(builtOverview?.sections[0].paragraphs).not.toBe(
			overview.sections[0].paragraphs,
		);
		overview.sections[0].paragraphs.push('Mutate');
		expect(builtOverview?.sections[0].paragraphs).toEqual(['Win']);
		overview.tokens.resources.gold.push('extra');
		expect(builtOverview?.tokens.resources?.gold).toEqual(['gold']);
		expect(metadata.assets?.custom).toEqual({
			inner: {
				label: 'Inner',
				description: 'Nested',
			},
		});
	});

	it('preserves provided passive evaluation modifiers', () => {
		const modifiers = { happiness: ['bonus'] };
		const { registries, content } = createBuilderOptions(modifiers);
		const metadata = buildSessionSnapshotMetadata({
			registries,
			content,
			passiveEvaluationModifiers: modifiers,
		});
		expect(metadata.passiveEvaluationModifiers).toBe(modifiers);
	});
});
