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
			'Spin up booming economies and trigger population perks.',
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
	'group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6',
	'shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl',
	'dark:border-white/5 dark:bg-slate-900/70',
].join(' ');

const HIGHLIGHT_OVERLAY_CLASS = [
	'absolute inset-0 bg-gradient-to-br from-amber-200/0 via-white/40 to-transparent opacity-0',
	'transition-opacity duration-200 group-hover:opacity-100 dark:via-white/5',
].join(' ');

export function HighlightsSection() {
	return (
		<section className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
			{HIGHLIGHTS.map(({ icon, title, description }) => (
				<div key={title} className={HIGHLIGHT_CARD_CLASS}>
					<div className={HIGHLIGHT_OVERLAY_CLASS} />
					<div className="relative flex flex-col gap-3 text-left">
						<div className="text-3xl">{icon}</div>
						<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
							{title}
						</h3>
						<p className="text-sm text-slate-600 dark:text-slate-300/80">
							{description}
						</p>
					</div>
				</div>
			))}
		</section>
	);
}
