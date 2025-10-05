import React from 'react';

export const SHOWCASE_BACKGROUND_CLASS = [
	'relative min-h-screen overflow-hidden bg-gradient-to-br',
	'from-amber-100 via-rose-100 to-sky-100 text-slate-900',
	'dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100',
].join(' ');

const BACKDROP_LAYER = [
	'pointer-events-none absolute inset-0',
	[
		'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),',
		'_rgba(255,255,255,0)_55%)]',
	].join(''),
	[
		'dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.55),',
		'_rgba(15,23,42,0)_60%)]',
	].join(''),
].join(' ');

const TOP_GLOW_CLASS = [
	'absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full',
	'bg-amber-300/30 blur-3xl dark:bg-amber-500/20',
].join(' ');

const BOTTOM_LEFT_GLOW_CLASS = [
	'absolute -bottom-20 -left-10 h-72 w-72 rounded-full',
	'bg-sky-300/30 blur-3xl dark:bg-sky-500/20',
].join(' ');

const RIGHT_GLOW_CLASS = [
	'absolute top-1/3 right-10 h-64 w-64 rounded-full',
	'bg-rose-300/30 blur-3xl dark:bg-rose-500/20',
].join(' ');

export const SHOWCASE_LAYOUT_CLASS = [
	'relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col',
	'items-center gap-16 px-6 py-16',
].join(' ');

export const SHOWCASE_BADGE_CLASS = [
	'inline-flex items-center gap-2 rounded-full border border-white/40',
	'bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em]',
	'text-amber-700 shadow-sm',
	'dark:border-white/10 dark:bg-white/10 dark:text-amber-200',
	'frosted-surface',
].join(' ');

const SHOWCASE_CARD_BASE_CLASS = [
	'w-full max-w-3xl rounded-3xl border border-white/50 bg-white/70 p-8',
	'shadow-2xl shadow-amber-900/10 dark:border-white/10 dark:bg-slate-900/70',
	'dark:shadow-slate-900/40',
	'frosted-surface',
].join(' ');

export const SHOWCASE_INTRO_CLASS = [
	'mt-4 max-w-2xl text-base text-slate-700',
	'dark:text-slate-300/90 sm:text-lg',
].join(' ');

interface ShowcaseBackgroundProps {
	children: React.ReactNode;
	className?: string;
}

export function ShowcaseBackground({
	children,
	className = '',
}: ShowcaseBackgroundProps) {
	return (
		<div className={`${SHOWCASE_BACKGROUND_CLASS} ${className}`}>
			<div className="pointer-events-none absolute inset-0">
				<div className={TOP_GLOW_CLASS} />
				<div className={BOTTOM_LEFT_GLOW_CLASS} />
				<div className={RIGHT_GLOW_CLASS} />
				<div className={BACKDROP_LAYER} />
			</div>
			{children}
		</div>
	);
}

interface ShowcaseLayoutProps {
	children: React.ReactNode;
	className?: string;
}

export function ShowcaseLayout({
	children,
	className = '',
}: ShowcaseLayoutProps) {
	return (
		<div className={`${SHOWCASE_LAYOUT_CLASS} ${className}`}>{children}</div>
	);
}

interface ShowcaseCardProps {
	children: React.ReactNode;
	className?: string;
	as?: keyof JSX.IntrinsicElements;
}

export function ShowcaseCard({
	children,
	className = '',
	as: Component = 'section',
}: ShowcaseCardProps) {
	return (
		<Component className={`${SHOWCASE_CARD_BASE_CLASS} ${className}`}>
			{children}
		</Component>
	);
}
