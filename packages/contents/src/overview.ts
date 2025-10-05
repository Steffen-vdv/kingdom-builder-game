import { ActionId } from './actions';

export type OverviewTokenCategoryName =
	| 'actions'
	| 'phases'
	| 'resources'
	| 'stats'
	| 'population'
	| 'static';

export type OverviewTokenCandidates = Partial<
	Record<OverviewTokenCategoryName, Record<string, string[]>>
>;

export type OverviewListItemTemplate = {
	icon?: string;
	label: string;
	body: string[];
};

export type OverviewParagraphTemplate = {
	kind: 'paragraph';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	paragraphs: string[];
};

export type OverviewListTemplate = {
	kind: 'list';
	id: string;
	icon: string;
	title: string;
	span?: boolean;
	items: OverviewListItemTemplate[];
};

export type OverviewSectionTemplate =
	| OverviewParagraphTemplate
	| OverviewListTemplate;

export type OverviewHeroTemplate = {
	badgeIcon: string;
	badgeLabel: string;
	title: string;
	intro: string;
	paragraph: string;
	tokens: Record<string, string>;
};

export type OverviewContentTemplate = {
	hero: OverviewHeroTemplate;
	sections: OverviewSectionTemplate[];
	tokens: OverviewTokenCandidates;
};

const HERO_INTRO_TEXT = [
	'Map the rhythms of the realm before you issue your first decree.',
	'Know where every resource, phase, and population surge will carry you.',
].join(' ');

const HERO_PARAGRAPH_TEXT = [
	'Welcome to {game}, a brisk duel of wits where {expand} expansion,',
	'{build} clever construction, and {army_attack} daring raids decide who steers the crown.',
].join(' ');

const DEFAULT_TOKENS: OverviewTokenCandidates = {
	actions: {
		[ActionId.expand]: [ActionId.expand],
		[ActionId.build]: [ActionId.build],
		[ActionId.develop]: [ActionId.develop],
		[ActionId.raise_pop]: [ActionId.raise_pop],
		[ActionId.army_attack]: [ActionId.army_attack],
	},
	phases: {
		growth: ['growth'],
		upkeep: ['upkeep'],
		main: ['main'],
	},
	resources: {
		gold: ['gold'],
		ap: ['ap'],
		happiness: ['happiness'],
		castleHP: ['castleHP'],
	},
	stats: {
		armyStrength: ['armyStrength'],
		fortificationStrength: ['fortificationStrength'],
	},
	population: {
		council: ['council'],
		legion: ['legion'],
		fortifier: ['fortifier'],
		citizen: ['citizen'],
	},
	static: {
		land: ['land'],
		slot: ['slot'],
	},
};

const DEFAULT_SECTIONS: OverviewSectionTemplate[] = [
	{
		kind: 'paragraph',
		id: 'objective',
		icon: 'castleHP',
		title: 'Your Objective',
		span: true,
		paragraphs: [
			'Keep your {castleHP} castle standing through every assault.',
			"Plot daring turns that unravel your rival's engine.",
			'Victory strikes when a stronghold falls or a ruler stalls out.',
			'The final round crowns the monarch with the healthiest realm.',
		],
	},
	{
		kind: 'list',
		id: 'turn-flow',
		icon: 'growth',
		title: 'Turn Flow',
		span: true,
		items: [
			{
				icon: 'growth',
				label: 'Growth',
				body: [
					'Kickstarts your engine with income and {armyStrength} Army strength.',
					'Stacks {fortificationStrength} Fortification bonuses and triggers automatic boons.',
				],
			},
			{
				icon: 'upkeep',
				label: 'Upkeep',
				body: [
					'Settles wages, ongoing effects, and any debts your realm has racked up.',
				],
			},
			{
				icon: 'main',
				label: 'Main Phase',
				body: [
					'Both players secretly queue actions.',
					'Reveal them in a flurry of {ap} AP-powered maneuvers.',
				],
			},
		],
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
				body: ['Fuels {build} buildings, diplomacy, and daring plays.'],
			},
			{
				icon: 'ap',
				label: 'Action Points',
				body: ['Are the energy for every turn in the {main} Main phase.'],
			},
			{
				icon: 'happiness',
				label: 'Happiness',
				body: ['Keeps the populace cheering instead of rioting.'],
			},
			{
				icon: 'castleHP',
				label: 'Castle HP',
				body: ['Is your lifeline—lose it and the dynasty topples.'],
			},
		],
	},
	{
		kind: 'paragraph',
		id: 'land',
		icon: 'land',
		title: 'Land & Developments',
		paragraphs: [
			'Claim {land} land and slot in {slot} developments to unlock perks.',
			'Farms pump {gold} gold while signature projects open slots or unleash passives.',
		],
	},
	{
		kind: 'list',
		id: 'population',
		icon: 'council',
		title: 'Population Roles',
		span: true,
		items: [
			{
				icon: 'council',
				label: 'Council',
				body: ['Rallies extra {ap} Action Points each round.'],
			},
			{
				icon: 'legion',
				label: 'Legion',
				body: [
					'Reinforces {armyStrength} Army strength for devastating {army_attack} raids.',
				],
			},
			{
				icon: 'fortifier',
				label: 'Fortifier',
				body: ['Cements your defenses with persistent buffs.'],
			},
			{
				icon: 'citizen',
				label: 'Citizens',
				body: ['Wait in the wings, ready to specialize as needed.'],
			},
		],
	},
	{
		kind: 'paragraph',
		id: 'actions',
		icon: 'develop',
		title: 'Actions & Strategy',
		span: true,
		paragraphs: [
			'Spend {ap} AP to {expand} grow territory or {develop} upgrade key lands.',
			'Field {raise_pop} specialists or launch {army_attack} attacks to snowball momentum.',
		],
	},
];

export const OVERVIEW_CONTENT: OverviewContentTemplate = {
	hero: {
		badgeIcon: '📘',
		badgeLabel: 'Know The Realm',
		title: 'Game Overview',
		intro: HERO_INTRO_TEXT,
		paragraph: HERO_PARAGRAPH_TEXT,
		tokens: {
			game: 'Kingdom Builder',
		},
	},
	sections: DEFAULT_SECTIONS,
	tokens: DEFAULT_TOKENS,
};
