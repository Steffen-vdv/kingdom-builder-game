import React from 'react';
import { useSoundEffectsContext } from '../../state/SoundEffectsContext';

const TOGGLE_BASE_CLASS = [
	'relative inline-flex h-7 w-14 items-center rounded-full',
	'border border-white/40 cursor-pointer transition-colors',
	'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70',
	'focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

const TOGGLE_CHECKED_CLASS = [
	'bg-emerald-500/80 shadow-inner shadow-emerald-600/40',
	'hover:bg-emerald-500/90 hover:shadow-emerald-600/50',
	'dark:hover:bg-emerald-400/80',
].join(' ');

const TOGGLE_UNCHECKED_CLASS = [
	'bg-slate-300/70 shadow-inner shadow-slate-500/30 dark:bg-slate-700/70',
	'hover:bg-slate-200/80 hover:shadow-slate-500/40',
	'dark:hover:bg-slate-600/70',
].join(' ');

type ToggleSwitchProps = {
	checked: boolean;
	onChange: (value: boolean) => void;
	className?: string;
	disabled?: boolean;
} & Pick<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	'aria-label' | 'aria-labelledby'
>;

export default function ToggleSwitch({
	checked,
	onChange,
	className = '',
	disabled = false,
	...ariaProps
}: ToggleSwitchProps) {
	const { playUiClick } = useSoundEffectsContext();
	const handleClick = () => {
		if (disabled) {
			return;
		}
		playUiClick();
		onChange(!checked);
	};

	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={handleClick}
			className={[
				TOGGLE_BASE_CLASS,
				checked ? TOGGLE_CHECKED_CLASS : TOGGLE_UNCHECKED_CLASS,
				className,
			].join(' ')}
			{...ariaProps}
		>
			<span
				className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-lg transition-transform duration-200 ${
					checked ? 'translate-x-7' : 'translate-x-1'
				}`}
			>
				{checked ? 'ON' : 'OFF'}
			</span>
		</button>
	);
}
