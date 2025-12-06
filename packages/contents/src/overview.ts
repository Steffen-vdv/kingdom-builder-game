import { ActionId, BuildActions, DevelopActions, HireActions } from './actions';
import { PhaseId } from './phaseTypes';
import { Resource } from './resourceKeys';
import { Stat } from './stats';
import { PopulationRole } from './populationRoles';

export type OverviewTokenCategoryName = 'actions' | 'phases' | 'resources' | 'stats' | 'population' | 'static';

export type OverviewTokenCandidates = Partial<Record<OverviewTokenCategoryName, Record<string, string[]>>>;

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

export type OverviewSectionTemplate = OverviewParagraphTemplate | OverviewListTemplate;

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

const HERO_INTRO_TEXT = ['Map the rhythms of the realm before you issue your first decree.', 'Know where every resource, phase, and population surge will carry you.'].join(' ');

const DEFAULT_BUILD_ACTION = BuildActions.build_town_charter;
const DEFAULT_DEVELOP_ACTION = DevelopActions.develop_farm;
const DEFAULT_HIRE_ACTION = HireActions.hire_council;

if (!DEFAULT_BUILD_ACTION) {
	throw new Error('Overview requires at least one building action.');
}
if (!DEFAULT_DEVELOP_ACTION) {
	throw new Error('Overview requires at least one development action.');
}
if (!DEFAULT_HIRE_ACTION) {
	throw new Error('Overview requires at least one population action.');
}

const HERO_PARAGRAPH_TEXT = [
	'Welcome to {game}, a brisk duel of wits where {expand} expansion,',
	`projects like {${DEFAULT_BUILD_ACTION}} show clever construction,`,
	'and {army_attack} daring raids decide who steers the crown.',
].join(' ');

const DEFAULT_TOKENS: OverviewTokenCandidates = {
	actions: {
		[ActionId.expand]: [ActionId.expand],
		[DEFAULT_BUILD_ACTION]: [DEFAULT_BUILD_ACTION],
		[DEFAULT_DEVELOP_ACTION]: [DEFAULT_DEVELOP_ACTION],
		[DEFAULT_HIRE_ACTION]: [DEFAULT_HIRE_ACTION],
		[ActionId.army_attack]: [ActionId.army_attack],
	},
	phases: {
		[PhaseId.Growth]: [PhaseId.Growth],
		[PhaseId.Upkeep]: [PhaseId.Upkeep],
		[PhaseId.Main]: [PhaseId.Main],
	},
	resources: {
		gold: [Resource.gold],
		ap: [Resource.ap],
		happiness: [Resource.happiness],
		castleHP: [Resource.castleHP],
	},
	stats: {
		armyStrength: [Stat.armyStrength],
		fortificationStrength: [Stat.fortificationStrength],
	},
	population: {
		council: [PopulationRole.Council],
		legion: [PopulationRole.Legion],
		fortifier: [PopulationRole.Fortifier],
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
		icon: Resource.castleHP,
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
		icon: PhaseId.Growth,
		title: 'Turn Flow',
		span: true,
		items: [
			{
				icon: PhaseId.Growth,
				label: 'Growth',
				body: ['Kickstarts your engine with income and {armyStrength} Army strength.', 'Stacks {fortificationStrength} Fortification bonuses and triggers automatic boons.'],
			},
			{
				icon: PhaseId.Upkeep,
				label: 'Upkeep',
				body: ['Settles wages, ongoing effects, and any debts your realm has racked up.'],
			},
			{
				icon: PhaseId.Main,
				label: 'Main Phase',
				body: ['Both players secretly queue actions.', 'Reveal them in a flurry of {ap} AP-powered maneuvers.'],
			},
		],
	},
	{
		kind: 'list',
		id: 'resources',
		icon: Resource.gold,
		title: 'Resources',
		items: [
			{
				icon: Resource.gold,
				label: 'Gold',
				body: [`Fuels projects like {${DEFAULT_BUILD_ACTION}}, diplomacy, and daring plays.`],
			},
			{
				icon: Resource.ap,
				label: 'Action Points',
				body: ['Are the energy for every turn in the {main} Main phase.'],
			},
			{
				icon: Resource.happiness,
				label: 'Happiness',
				body: ['Keeps the populace cheering instead of rioting.'],
			},
			{
				icon: Resource.castleHP,
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
		paragraphs: ['Claim {land} land and slot in {slot} developments to unlock perks.', 'Farms pump {gold} gold while signature projects open slots or unleash passives.'],
	},
	{
		kind: 'list',
		id: 'population',
		icon: PopulationRole.Council,
		title: 'Population Roles',
		span: true,
		items: [
			{
				icon: PopulationRole.Council,
				label: 'Council',
				body: ['Rallies extra {ap} Action Points each round.'],
			},
			{
				icon: PopulationRole.Legion,
				label: 'Legion',
				body: ['Reinforces {armyStrength} Army strength for devastating {army_attack} raids.'],
			},
			{
				icon: PopulationRole.Fortifier,
				label: 'Fortifier',
				body: ['Cements your defenses with persistent buffs.'],
			},
		],
	},
	{
		kind: 'paragraph',
		id: 'actions',
		icon: DEFAULT_DEVELOP_ACTION,
		title: 'Actions & Strategy',
		span: true,
		paragraphs: [
			`Spend {ap} AP to {expand} grow territory or {${DEFAULT_DEVELOP_ACTION}} upgrade key lands.`,
			`Field {${DEFAULT_HIRE_ACTION}} specialists or launch {army_attack} attacks to snowball momentum.`,
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
