import type {
	SessionOverviewContent,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import { createBaseSessionMetadata } from '../../src/session/SessionMetadataBuilder.js';

type MetadataBuilderFactory = () => SessionSnapshotMetadata;

export const SYNTHETIC_COST_KEY = 'synthetic:cost' as const;
export const SYNTHETIC_GAIN_KEY = 'synthetic:gain' as const;

export const SYNTHETIC_OVERVIEW = {
	hero: {
		badgeIcon: 'synthetic:badge',
		badgeLabel: 'Synthetic Badge',
		title: 'Synthetic Overview',
		intro: 'Lead the test realm to glory.',
		paragraph: 'Chart a path through synthetic content.',
		tokens: { realm: 'Synthetic Realm' },
	},
	sections: [
		{
			kind: 'paragraph',
			id: 'synthetic:intro',
			icon: 'synthetic:intro',
			title: 'Synthetic Introduction',
			paragraphs: ['Survey the cost and gain landscape.'],
		},
		{
			kind: 'list',
			id: 'synthetic:list',
			icon: 'synthetic:list',
			title: 'Synthetic Checklist',
			items: [
				{
					icon: 'synthetic:item',
					label: 'Prepare Actions',
					body: ['Queue synthetic maneuvers.'],
				},
			],
		},
	],
	tokens: {
		resources: {
			[SYNTHETIC_COST_KEY]: [SYNTHETIC_COST_KEY],
			[SYNTHETIC_GAIN_KEY]: [SYNTHETIC_GAIN_KEY],
		},
		static: {
			highlight: ['land'],
		},
	},
} satisfies SessionOverviewContent;

export function createMetadataBuilderWithOverview(): MetadataBuilderFactory {
	return () => {
		const metadata = createBaseSessionMetadata();
		const baseResources = metadata.resources ?? {};
		metadata.resources = {
			...baseResources,
			[SYNTHETIC_COST_KEY]: { label: SYNTHETIC_COST_KEY },
			[SYNTHETIC_GAIN_KEY]: { label: SYNTHETIC_GAIN_KEY },
		};
		metadata.overview = structuredClone(SYNTHETIC_OVERVIEW);
		return metadata;
	};
}
