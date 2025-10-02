import React from 'react';

const HIGHLIGHTS = [
	{
		icon: '⚔️',
		title: 'Lead Bold Campaigns',
		description: [
			'Chain daring orders and spring ambushes.',
			'Steal momentum before rivals can react.',
		].join(' '),
	},
	{
		icon: '🌱',
		title: 'Turbocharge Your Realm',
		description: [
			'Spin up booming economies and trigger',
			'population perks.',
			'Let every turn snowball into the next.',
		].join(' '),
	},
	{
		icon: '🧠',
		title: 'Forge Wild Combos',
		description: [
			'Unlock outrageous developments that bend the rules.',
			'Stitch together synergies that reshape the map.',
		].join(' '),
	},
];

const HIGHLIGHT_CARD_CLASS = [
	'group relative overflow-hidden rounded-2xl border border-white/60',
	'bg-white/70 p-6 shadow-lg transition-transform duration-200',
	'hover:-translate-y-1 hover:shadow-2xl',
	'dark:border-white/5 dark:bg-slate-900/70',
].join(' ');

const HIGHLIGHT_OVERLAY_CLASS = [
	'absolute inset-0 bg-gradient-to-br from-amber-200/0 via-white/40',
	'to-transparent opacity-0 transition-opacity duration-200',
	'group-hover:opacity-100 dark:via-white/5',
].join(' ');

const HIGHLIGHTS_SECTION_CLASS = [
	'grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3',
].join(' ');

const HIGHLIGHT_CONTENT_CLASS = ['relative flex flex-col gap-3 text-left'].join(
	' ',
);

const HIGHLIGHT_TITLE_CLASS = [
	'text-lg font-semibold text-slate-900',
	'dark:text-slate-100',
].join(' ');

const HIGHLIGHT_TEXT_CLASS = [
	'text-sm text-slate-600',
	'dark:text-slate-300/80',
].join(' ');

function HighlightCardItem({
	icon,
	title,
	description,
}: (typeof HIGHLIGHTS)[number]) {
	return (
		<div className={HIGHLIGHT_CARD_CLASS}>
			<div className={HIGHLIGHT_OVERLAY_CLASS} />
			<div className={HIGHLIGHT_CONTENT_CLASS}>
				<div className="text-3xl">{icon}</div>
				<h3 className={HIGHLIGHT_TITLE_CLASS}>{title}</h3>
				<p className={HIGHLIGHT_TEXT_CLASS}>{description}</p>
			</div>
		</div>
	);
}

export function HighlightsSection() {
	return (
		<section className={HIGHLIGHTS_SECTION_CLASS}>
			{HIGHLIGHTS.map((highlight) => (
				<HighlightCardItem key={highlight.title} {...highlight} />
			))}
		</section>
	);
}
