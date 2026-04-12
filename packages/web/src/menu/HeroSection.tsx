import {
	SHOWCASE_BADGE_CLASS,
	SHOWCASE_INTRO_CLASS,
} from '../components/layouts/ShowcasePage';
import { useVisitorCount } from '../state/useVisitorCount';

function VisitorCountSubtitle() {
	const { totalVisitors, isLoading, error } = useVisitorCount();

	if (isLoading || error || totalVisitors === null) {
		return null;
	}

	return (
		<p className="mt-1 text-sm text-stone-500">
			{totalVisitors.toLocaleString()} visitors in last 24h
		</p>
	);
}

export function HeroSection() {
	return (
		<header className="flex flex-col items-center text-center">
			<span className={SHOWCASE_BADGE_CLASS}>
				<span className="text-lg">🎲</span>
				<span>Forge Your Game</span>
			</span>
			<h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
				BoardSmith
			</h1>
			<VisitorCountSubtitle />
			<p className={SHOWCASE_INTRO_CLASS}>
				{[
					'A digital board game engine for strategic minds.',
					'Choose your game, shape your strategy,',
					'and craft victory one turn at a time.',
				].join(' ')}
			</p>
		</header>
	);
}
