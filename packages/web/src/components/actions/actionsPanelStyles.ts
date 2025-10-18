export const SECTION_CLASS_NAMES = [
	'relative',
	'rounded-3xl',
	'border',
	'border-white/60',
	'bg-white/75',
	'p-6',
	'shadow-2xl',
	'backdrop-blur-xl',
	'dark:border-white/10',
	'dark:bg-slate-900/70',
	'dark:shadow-slate-900/50',
	'frosted-surface',
] as const;

export const OVERLAY_CLASS_NAMES = [
	'pointer-events-none',
	'absolute',
	'inset-0',
	'rounded-3xl',
	'bg-gradient-to-br',
	'from-white/70',
	'via-white/55',
	'to-white/10',
	'ring-1',
	'ring-inset',
	'ring-white/60',
	'dark:from-slate-100/15',
	'dark:via-slate-100/10',
	'dark:to-transparent',
	'dark:ring-white/10',
] as const;

export const HEADER_CLASS_NAMES = [
	'mb-4',
	'flex',
	'flex-col',
	'gap-3',
	'sm:flex-row',
	'sm:items-center',
	'sm:justify-between',
] as const;

export const TITLE_CLASS_NAMES = [
	'text-2xl',
	'font-semibold',
	'tracking-tight',
	'text-slate-900',
	'dark:text-slate-100',
] as const;

export const COST_LABEL_CLASS_NAMES = [
	'text-base',
	'font-normal',
	'text-slate-500',
	'dark:text-slate-300',
] as const;

export const INDICATOR_PILL_CLASS_NAMES = [
	'rounded-full',
	'border',
	'border-white/60',
	'bg-white/70',
	'px-3',
	'py-1',
	'text-xs',
	'font-semibold',
	'uppercase',
	'tracking-[0.3em]',
	'text-slate-600',
	'shadow-sm',
	'dark:border-white/10',
	'dark:bg-white/10',
	'dark:text-slate-200',
	'frosted-surface',
] as const;

export const TOGGLE_BUTTON_CLASS_NAMES = [
	'inline-flex',
	'h-10',
	'w-10',
	'items-center',
	'justify-center',
	'leading-none',
	'rounded-full',
	'border',
	'border-white/60',
	'bg-white/70',
	'cursor-pointer',
	'text-lg',
	'font-semibold',
	'text-slate-900',
	'shadow-md',
	'transition',
	'hover:bg-white/90',
	'hover:text-slate-400',
	'focus:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-amber-400',
	'dark:border-white/10',
	'dark:bg-slate-900/80',
	'dark:text-slate-100',
	'dark:hover:bg-slate-900',
] as const;

export const joinClassNames = (classNames: readonly string[]) =>
	classNames.join(' ');

export const SECTION_CLASSES = joinClassNames(SECTION_CLASS_NAMES);
export const OVERLAY_CLASSES = joinClassNames(OVERLAY_CLASS_NAMES);
export const HEADER_CLASSES = joinClassNames(HEADER_CLASS_NAMES);
export const TITLE_CLASSES = joinClassNames(TITLE_CLASS_NAMES);
export const COST_LABEL_CLASSES = joinClassNames(COST_LABEL_CLASS_NAMES);
export const INDICATOR_PILL_CLASSES = joinClassNames(
	INDICATOR_PILL_CLASS_NAMES,
);
export const TOGGLE_BUTTON_CLASSES = joinClassNames(TOGGLE_BUTTON_CLASS_NAMES);
