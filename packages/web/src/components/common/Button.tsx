import React from 'react';

type ButtonVariant =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'danger'
	| 'ghost'
	| 'dev';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	icon: React.ReactNode;
	iconPosition?: 'left' | 'right';
	variant?: ButtonVariant;
};

const BASE_CLASS = [
	'inline-flex',
	'items-center',
	'justify-start',
	'gap-3',
	'rounded-2xl',
	'border',
	'px-4',
	'py-2.5',
	'text-left',
	'text-sm',
	'font-semibold',
	'leading-5',
	'shadow-sm',
	'transition',
	'duration-150',
	'ease-out',
	'focus:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-offset-2',
	'focus-visible:ring-offset-white',
	'dark:focus-visible:ring-offset-slate-900',
	'disabled:cursor-not-allowed',
	'disabled:opacity-60',
].join(' ');

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	primary: [
		'border-indigo-500/80',
		'bg-indigo-600',
		'text-white',
		'hover:bg-indigo-500',
		'focus-visible:ring-indigo-300/70',
	].join(' '),
	secondary: [
		'border-slate-500/50',
		'bg-slate-900/80',
		'text-slate-100',
		'hover:bg-slate-900/70',
		'dark:border-slate-500/40',
		'dark:bg-slate-800/80',
		'dark:hover:bg-slate-700/80',
		'focus-visible:ring-slate-400/60',
	].join(' '),
	success: [
		'border-emerald-500/70',
		'bg-emerald-600',
		'text-white',
		'hover:bg-emerald-500',
		'focus-visible:ring-emerald-300/70',
	].join(' '),
	danger: [
		'border-rose-500/70',
		'bg-rose-600',
		'text-white',
		'hover:bg-rose-500',
		'focus-visible:ring-rose-300/70',
	].join(' '),
	ghost: [
		'border-white/40',
		'bg-white/60',
		'text-slate-800',
		'hover:bg-white/75',
		'dark:border-white/10',
		'dark:bg-white/10',
		'dark:text-slate-100',
		'dark:hover:bg-white/20',
		'focus-visible:ring-white/50',
	].join(' '),
	dev: [
		'border-fuchsia-500/70',
		'bg-fuchsia-600',
		'text-white',
		'hover:bg-fuchsia-500',
		'focus-visible:ring-fuchsia-300/70',
	].join(' '),
};

export default function Button({
	icon,
	iconPosition = 'left',
	variant = 'secondary',
	disabled,
	className = '',
	type = 'button',
	children,
	...rest
}: ButtonProps) {
	const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.secondary;
	const directionClass = iconPosition === 'right' ? 'flex-row-reverse' : '';
	const hoverClass = disabled ? '' : 'hoverable';
	const finalClass = [
		BASE_CLASS,
		directionClass,
		hoverClass,
		variantClass,
		className,
	]
		.filter(Boolean)
		.join(' ');
	return (
		<button type={type} disabled={disabled} className={finalClass} {...rest}>
			<span
				aria-hidden
				className="flex h-5 w-5 items-center justify-center text-base leading-none"
			>
				{icon}
			</span>
			{children ? <span className="flex-1 text-left">{children}</span> : null}
		</button>
	);
}
