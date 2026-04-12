const CARD_CLASS = [
	'group flex cursor-pointer flex-col gap-2',
	'rounded-xl border border-slate-200/60 bg-white/60',
	'p-5 text-left transition',
	'hover:border-indigo-300 hover:bg-white/80',
	'hover:shadow-md',
	'dark:border-white/10 dark:bg-white/5',
	'dark:hover:border-indigo-500/40',
	'dark:hover:bg-white/10',
].join(' ');

const ICON_CLASS = 'text-3xl';

const NAME_CLASS = [
	'text-base font-semibold text-slate-800',
	'dark:text-slate-100',
].join(' ');

const MODE_COUNT_CLASS = ['text-xs text-slate-400', 'dark:text-slate-500'].join(
	' ',
);

interface SpaceCardProps {
	name: string;
	icon: string;
	modeCount: number;
	onSelect: () => void;
}

export function SpaceCard({ name, icon, modeCount, onSelect }: SpaceCardProps) {
	const label = modeCount === 1 ? '1 game mode' : `${modeCount} game modes`;
	return (
		<button type="button" className={CARD_CLASS} onClick={onSelect}>
			<div className="flex items-center gap-3">
				<span className={ICON_CLASS}>{icon}</span>
				<div className="flex flex-col">
					<span className={NAME_CLASS}>{name}</span>
					<span className={MODE_COUNT_CLASS}>{label}</span>
				</div>
			</div>
		</button>
	);
}
