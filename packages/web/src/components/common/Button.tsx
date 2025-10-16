import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'dev';
	icon: React.ReactNode;
};

const VARIANT_CLASSES: Record<string, string> = {
	primary: [
		'bg-gradient-to-r',
		'from-blue-600',
		'to-indigo-500',
		'text-white',
		'shadow-md',
		'shadow-blue-600/30',
		'hover:from-blue-500',
		'hover:to-indigo-400',
		'focus-visible:ring-blue-200/80',
	].join(' '),
	secondary: [
		'bg-slate-900/80',
		'text-white',
		'shadow-md',
		'shadow-slate-900/30',
		'hover:bg-slate-900/70',
		'dark:bg-white/15',
		'dark:text-slate-100',
		'dark:hover:bg-white/20',
		'focus-visible:ring-slate-200/60',
	].join(' '),
	success: [
		'bg-gradient-to-r',
		'from-emerald-500',
		'to-teal-500',
		'text-white',
		'shadow-md',
		'shadow-emerald-500/30',
		'hover:from-emerald-400',
		'hover:to-teal-400',
		'focus-visible:ring-emerald-200/70',
	].join(' '),
	danger: [
		'bg-gradient-to-r',
		'from-rose-500',
		'to-red-500',
		'text-white',
		'shadow-md',
		'shadow-rose-500/40',
		'hover:from-rose-400',
		'hover:to-red-400',
		'focus-visible:ring-rose-200/70',
	].join(' '),
	ghost: [
		'bg-transparent',
		'text-slate-700',
		'hover:bg-white/60',
		'dark:text-slate-200',
		'dark:hover:bg-white/10',
		'focus-visible:ring-white/40',
	].join(' '),
	dev: [
		'bg-gradient-to-r',
		'from-purple-600',
		'to-fuchsia-500',
		'text-white',
		'shadow-md',
		'shadow-purple-500/40',
		'hover:from-purple-500',
		'hover:to-fuchsia-400',
		'focus-visible:ring-purple-200/70',
	].join(' '),
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
	const buttonClasses = [
		'inline-flex items-center gap-3 justify-start rounded-full',
		'px-4 py-2 text-left text-sm font-semibold leading-snug transition',
		'disabled:cursor-not-allowed disabled:opacity-50',
		disabled ? '' : 'hoverable cursor-pointer',
		variantClass,
		'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
		className,
	]
		.filter(Boolean)
		.join(' ');
	return (
		<button type={type} disabled={disabled} className={buttonClasses} {...rest}>
			<span
				aria-hidden
				className="flex h-6 w-6 shrink-0 items-center justify-center text-base leading-none"
			>
				{icon}
			</span>
			{children ? <span className="flex-1 text-left">{children}</span> : null}
		</button>
	);
}
