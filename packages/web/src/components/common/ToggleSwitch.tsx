import React from 'react';

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
	const handleClick = () => {
		if (disabled) {
			return;
		}
		onChange(!checked);
	};

	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={handleClick}
			className={`relative inline-flex h-7 w-14 items-center rounded-full border border-white/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
				checked
					? 'bg-emerald-500/80 shadow-inner shadow-emerald-600/40'
					: 'bg-slate-300/70 shadow-inner shadow-slate-500/30 dark:bg-slate-700/70'
			} ${className}`}
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
