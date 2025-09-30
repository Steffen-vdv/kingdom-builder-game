import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
};

const VARIANT_CLASSES: Record<string, string> = {
	primary:
		'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-400 focus-visible:ring-blue-200/80',
	secondary:
		'bg-slate-900/80 text-white shadow-lg shadow-slate-900/30 hover:bg-slate-900/70 dark:bg-white/15 dark:text-slate-100 dark:hover:bg-white/20 focus-visible:ring-slate-200/60',
	success:
		'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-400 hover:to-teal-400 focus-visible:ring-emerald-200/70',
	danger:
		'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/40 hover:from-rose-400 hover:to-red-400 focus-visible:ring-rose-200/70',
	ghost:
		'bg-transparent text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10 focus-visible:ring-white/40',
};

export default function Button({
	variant = 'secondary',
	disabled,
	className = '',
	type = 'button',
	...rest
}: ButtonProps) {
	const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary;
	return (
		<button
			type={type}
			disabled={disabled}
			className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
				disabled ? '' : 'hoverable'
			} ${variantClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${className}`}
			{...rest}
		/>
	);
}
