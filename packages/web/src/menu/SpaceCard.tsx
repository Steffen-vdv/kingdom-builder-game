import { useCallback } from 'react';
import { useSoundEffectsContext } from '../state/SoundEffectsContext';

const CARD_CLASS = [
	'group relative flex cursor-pointer flex-col gap-2',
	'overflow-hidden rounded-xl border',
	'p-5 text-left transition-all duration-200',
	'hover:shadow-lg',
].join(' ');

const HOVER_OVERLAY_CLASS = [
	'pointer-events-none absolute inset-0',
	'opacity-0 transition-opacity duration-200',
	'group-hover:opacity-100',
].join(' ');

const ICON_CLASS = [
	'flex h-11 w-11 shrink-0 items-center justify-center',
	'rounded-lg text-2xl',
].join(' ');

const NAME_CLASS = [
	'text-base font-bold tracking-tight text-slate-800',
	'dark:text-slate-100',
].join(' ');

const MODE_COUNT_CLASS = ['text-xs font-medium'].join(' ');

interface SpaceCardProps {
	name: string;
	icon: string;
	accentColor: string;
	modeCount: number;
	onSelect: () => void;
}

export function SpaceCard({
	name,
	icon,
	accentColor,
	modeCount,
	onSelect,
}: SpaceCardProps) {
	const { playUiClick } = useSoundEffectsContext();

	const handleClick = useCallback(() => {
		playUiClick();
		onSelect();
	}, [playUiClick, onSelect]);

	const label = modeCount === 1 ? '1 game mode' : `${modeCount} game modes`;

	return (
		<button
			type="button"
			className={CARD_CLASS}
			onClick={handleClick}
			style={{
				borderColor: `${accentColor}40`,
				backgroundColor: `${accentColor}08`,
			}}
		>
			<span
				aria-hidden
				className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
				style={{ backgroundColor: accentColor }}
			/>
			<span
				aria-hidden
				className={HOVER_OVERLAY_CLASS}
				style={{ backgroundColor: `${accentColor}12` }}
			/>
			<div className="flex items-center gap-3">
				<span
					className={ICON_CLASS}
					style={{ backgroundColor: `${accentColor}18` }}
				>
					{icon}
				</span>
				<div className="flex flex-col">
					<span className={NAME_CLASS}>{name}</span>
					<span className={MODE_COUNT_CLASS} style={{ color: accentColor }}>
						{label}
					</span>
				</div>
			</div>
		</button>
	);
}
