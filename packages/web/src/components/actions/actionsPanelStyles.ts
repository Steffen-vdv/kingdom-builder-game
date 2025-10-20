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

export const TAB_LIST_CLASS_NAMES = [
	'mb-4',
	'flex',
	'flex-wrap',
	'gap-2',
	'rounded-3xl',
	'bg-white/60',
	'p-2',
	'dark:bg-slate-900/70',
] as const;

export const TAB_BUTTON_CLASS_NAMES = [
	'flex',
	'min-w-[12rem]',
	'flex-1',
	'items-center',
	'justify-between',
	'gap-3',
	'rounded-2xl',
	'border',
	'border-transparent',
	'px-4',
	'py-3',
	'text-left',
	'text-sm',
	'font-semibold',
	'tracking-wide',
	'transition',
	'hoverable',
	'cursor-pointer',
	'focus:outline-none',
	'focus-visible:ring-2',
	'focus-visible:ring-emerald-300',
	'dark:focus-visible:ring-emerald-500/60',
] as const;

export const TAB_BUTTON_ACTIVE_CLASS_NAMES = [
	'bg-emerald-100',
	'text-emerald-900',
	'shadow-sm',
	'shadow-emerald-500/20',
	'hover:bg-emerald-200',
	'dark:bg-emerald-500/20',
	'dark:text-emerald-100',
	'dark:shadow-black/40',
	'dark:hover:bg-emerald-500/30',
] as const;

export const TAB_BUTTON_INACTIVE_CLASS_NAMES = [
	'bg-white/60',
	'text-slate-600',
	'hover:bg-emerald-50',
	'hover:text-emerald-700',
	'dark:bg-slate-900/70',
	'dark:text-slate-200',
	'dark:hover:bg-slate-800/70',
	'dark:hover:text-emerald-200',
] as const;

export const TAB_COUNT_BADGE_CLASS_NAMES = [
	'rounded-full',
	'bg-white/70',
	'px-3',
	'py-1',
	'text-xs',
	'font-semibold',
	'tracking-wide',
	'text-slate-600',
	'shadow-sm',
	'dark:bg-slate-900/70',
	'dark:text-slate-100',
] as const;

export const TAB_ICON_CLASS_NAMES = [
	'flex',
	'items-center',
	'text-lg',
	'leading-none',
] as const;

export const TAB_LABEL_CLASS_NAMES = ['flex', 'items-center', 'gap-2'] as const;

export const TAB_PANEL_CLASS_NAMES = [
	'rounded-3xl',
	'border',
	'border-white/60',
	'bg-white/60',
	'p-4',
	'dark:border-white/10',
	'dark:bg-slate-900/60',
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
export const TAB_LIST_CLASSES = joinClassNames(TAB_LIST_CLASS_NAMES);
export const TAB_BUTTON_CLASSES = joinClassNames(TAB_BUTTON_CLASS_NAMES);
export const TAB_BUTTON_ACTIVE_CLASSES = joinClassNames(
	TAB_BUTTON_ACTIVE_CLASS_NAMES,
);
export const TAB_BUTTON_INACTIVE_CLASSES = joinClassNames(
	TAB_BUTTON_INACTIVE_CLASS_NAMES,
);
export const TAB_COUNT_BADGE_CLASSES = joinClassNames(
	TAB_COUNT_BADGE_CLASS_NAMES,
);
export const TAB_ICON_CLASSES = joinClassNames(TAB_ICON_CLASS_NAMES);
export const TAB_LABEL_CLASSES = joinClassNames(TAB_LABEL_CLASS_NAMES);
export const TAB_PANEL_CLASSES = joinClassNames(TAB_PANEL_CLASS_NAMES);
