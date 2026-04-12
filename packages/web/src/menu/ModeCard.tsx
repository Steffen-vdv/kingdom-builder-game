import type { ContentPackageMeta } from '@kingdom-builder/protocol';

const CARD_BASE_CLASS = [
	'group flex cursor-pointer flex-col gap-2',
	'rounded-xl border border-slate-200/60 bg-white/60',
	'p-4 text-left transition',
	'hover:border-indigo-300 hover:bg-white/80',
	'hover:shadow-md',
	'dark:border-white/10 dark:bg-white/5',
	'dark:hover:border-indigo-500/40',
	'dark:hover:bg-white/10',
].join(' ');

const DEFAULT_BADGE_CLASS = [
	'ml-2 rounded-full bg-indigo-100 px-2 py-0.5',
	'text-[10px] font-semibold uppercase tracking-wider',
	'text-indigo-600',
	'dark:bg-indigo-900/40 dark:text-indigo-300',
].join(' ');

const ICON_CLASS = 'text-2xl';

const NAME_CLASS = [
	'text-sm font-semibold text-slate-800',
	'dark:text-slate-100',
].join(' ');

const DESCRIPTION_CLASS = [
	'text-xs leading-relaxed text-slate-500',
	'dark:text-slate-400',
].join(' ');

interface ModeCardProps {
	pkg: ContentPackageMeta;
	isDefault: boolean;
	onSelect: () => void;
}

export function ModeCard({ pkg, isDefault, onSelect }: ModeCardProps) {
	return (
		<button type="button" className={CARD_BASE_CLASS} onClick={onSelect}>
			<div className="flex items-center gap-2">
				{pkg.icon ? <span className={ICON_CLASS}>{pkg.icon}</span> : null}
				<span className={NAME_CLASS}>{pkg.name}</span>
				{isDefault ? (
					<span className={DEFAULT_BADGE_CLASS}>Default</span>
				) : null}
			</div>
			{pkg.description ? (
				<p className={DESCRIPTION_CLASS}>{pkg.description}</p>
			) : null}
		</button>
	);
}
