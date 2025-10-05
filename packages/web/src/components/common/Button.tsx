import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'dev';
	icon: React.ReactNode;
};

const VARIANT_CLASSES: Record<string, string> = {
	primary:
		'border-blue-500 bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-200/70',
	secondary:
		'border-slate-500/70 bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:ring-slate-200/60 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700/90',
	success:
		'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-200/70',
	danger:
		'border-rose-500 bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-200/70',
	ghost:
		'border-transparent bg-transparent text-slate-700 hover:bg-slate-200/60 focus-visible:ring-slate-200/50 dark:text-slate-200 dark:hover:bg-white/10 dark:focus-visible:ring-white/30',
	dev: 'border-fuchsia-500 bg-fuchsia-600 text-white hover:bg-fuchsia-500 focus-visible:ring-fuchsia-200/70',
};

export default function Button({
	variant = 'secondary',
	disabled,
	className = '',
	type = 'button',
	icon,
	children,
	...rest
}: ButtonProps) {
	const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary;
	return (
		<button
			type={type}
			disabled={disabled}
			className={`inline-flex items-center justify-start gap-3 rounded-xl border px-4 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
				disabled ? '' : 'hoverable'
			} ${variantClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${className}`}
			{...rest}
		>
			<span
				aria-hidden
				className="flex h-6 w-6 items-center justify-center text-base"
			>
				{icon}
			</span>
			<span className="flex-1 text-left leading-tight">{children}</span>
		</button>
	);
}
