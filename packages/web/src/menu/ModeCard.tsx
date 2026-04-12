import { useCallback } from 'react';
import type { ContentPackageMeta } from '@boardsmith/protocol';
import { useSoundEffectsContext } from '../state/SoundEffectsContext';

const CARD_BASE_CLASS = [
	'group relative flex cursor-pointer flex-col gap-2',
	'overflow-hidden rounded-xl border',
	'p-4 text-left transition-all duration-200',
	'hover:shadow-lg',
].join(' ');

const HOVER_OVERLAY_CLASS = [
	'pointer-events-none absolute inset-0',
	'opacity-0 transition-opacity duration-200',
	'group-hover:opacity-100',
].join(' ');

const BADGE_CLASS = [
	'shrink-0 whitespace-nowrap rounded-full',
	'border px-1.5 py-0.5',
	'text-[10px] font-semibold uppercase',
].join(' ');

const ICON_CLASS = [
	'flex h-9 w-9 shrink-0 items-center justify-center',
	'rounded-lg text-xl',
].join(' ');

const NAME_CLASS = [
	'text-sm font-bold tracking-tight text-slate-800',
	'dark:text-slate-100',
].join(' ');

const TAGLINE_CLASS = ['text-xs font-medium italic leading-snug'].join(' ');

const DESCRIPTION_CLASS = [
	'text-xs leading-relaxed text-slate-500',
	'dark:text-slate-400',
].join(' ');

const DEFAULT_ACCENT = '#6366f1';

interface ModeCardProps {
	pkg: ContentPackageMeta;
	onSelect: () => void;
}

export function ModeCard({ pkg, onSelect }: ModeCardProps) {
	const { playUiClick } = useSoundEffectsContext();
	const accent = pkg.accentColor ?? DEFAULT_ACCENT;

	const handleClick = useCallback(() => {
		playUiClick();
		onSelect();
	}, [playUiClick, onSelect]);

	return (
		<button
			type="button"
			className={CARD_BASE_CLASS}
			onClick={handleClick}
			style={{
				borderColor: `${accent}40`,
				backgroundColor: `${accent}08`,
			}}
		>
			<span
				aria-hidden
				className="absolute inset-x-0 top-0 h-0.5"
				style={{ backgroundColor: accent }}
			/>
			<span
				aria-hidden
				className={HOVER_OVERLAY_CLASS}
				style={{ backgroundColor: `${accent}12` }}
			/>

			<div className="flex items-center gap-2">
				{pkg.icon ? (
					<span
						className={ICON_CLASS}
						style={{ backgroundColor: `${accent}18` }}
					>
						{pkg.icon}
					</span>
				) : null}
				<span className={NAME_CLASS}>{pkg.name}</span>
				{pkg.badge ? (
					<span
						className={BADGE_CLASS}
						style={{
							borderColor: `${accent}50`,
							color: accent,
						}}
					>
						{pkg.badge}
					</span>
				) : null}
			</div>

			{pkg.tagline ? (
				<p className={TAGLINE_CLASS} style={{ color: accent }}>
					{pkg.tagline}
				</p>
			) : null}

			{pkg.description ? (
				<p className={DESCRIPTION_CLASS}>{pkg.description}</p>
			) : null}
		</button>
	);
}
