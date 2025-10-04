import {
	SHOWCASE_BADGE_CLASS,
	SHOWCASE_INTRO_CLASS,
} from '../components/layouts/ShowcasePage';

export function HeroSection() {
	return (
		<header className="flex flex-col items-center text-center">
			<span className={SHOWCASE_BADGE_CLASS}>
				<span className="text-lg">🏰</span>
				<span>Rule Your Realm</span>
			</span>
			<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
				Kingdom Builder
			</h1>
			<p className={SHOWCASE_INTRO_CLASS}>
				{[
					'Craft a flourishing dynasty with tactical choices,',
					'evolving lands, and a thriving population.',
					'Each turn is a new chapter in your royal saga.',
				].join(' ')}
			</p>
		</header>
	);
}
