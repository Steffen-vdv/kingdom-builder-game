export const PANEL_CLASS_NAMES = [
	'relative',
	'flex',
	'w-full',
	'flex-col',
	'gap-6',
	'rounded-3xl',
	'border',
	'border-white/40',
	'bg-gradient-to-br',
	'from-white/80',
	'via-white/70',
	'to-white/40',
	'p-6',
	'shadow-xl',
	'backdrop-blur',
	'dark:border-white/10',
	'dark:from-slate-900/80',
	'dark:via-slate-900/70',
	'dark:to-slate-900/60',
	'dark:shadow-slate-900/40',
] as const;

export const HEADER_CLASS_NAMES = [
	'flex',
	'flex-wrap',
	'items-center',
	'justify-between',
	'gap-4',
] as const;

export const TURN_SUMMARY_CLASS_NAMES = [
	'flex',
	'flex-wrap',
	'items-center',
	'gap-4',
	'rounded-2xl',
	'border',
	'border-white/60',
	'px-4',
	'py-3',
	'text-sm',
	'text-slate-700',
	'shadow-sm',
	'dark:border-white/10',
	'dark:text-slate-100',
] as const;

export const TURN_BADGE_CLASS_NAMES = [
	'flex',
	'items-center',
	'gap-2',
	'rounded-xl',
	'bg-indigo-600/90',
	'px-3',
	'py-1',
	'text-xs',
	'font-semibold',
	'uppercase',
	'tracking-[0.25em]',
	'text-white',
	'shadow',
] as const;

export const PLAYER_DETAILS_CLASS_NAMES = [
	'flex',
	'flex-col',
	'gap-0.5',
	'text-left',
] as const;

export const PLAYER_LABEL_CLASS_NAMES = [
	'uppercase',
	'tracking-[0.3em]',
	'text-[0.625rem]',
	'text-slate-500',
	'dark:text-slate-300',
] as const;

export const PLAYER_NAME_CLASS_NAMES = [
	'text-base',
	'font-semibold',
	'text-slate-800',
	'dark:text-white',
] as const;

export const PHASE_SECTION_CLASS_NAMES = ['flex', 'flex-col', 'gap-3'] as const;

export const PHASE_LIST_CLASS_NAMES = [
	'grid',
	'gap-3',
	'sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]',
	'sm:gap-3',
] as const;

export const PHASE_LIST_ITEM_CLASS_NAMES = [
	'flex',
	'items-center',
	'rounded-2xl',
	'border',
	'border-white/40',
	'px-3',
	'py-2',
	'text-left',
	'text-sm',
	'font-medium',
	'tracking-[0.08em]',
	'text-slate-600',
	'transition-all',
	'duration-200',
	'ease-out',
	'bg-white/70',
	'shadow-sm',
	'dark:border-white/10',
	'dark:bg-slate-900/60',
	'dark:text-slate-100',
	'hover:-translate-y-0.5',
	'hover:bg-white/60',
	'hover:shadow-lg',
	'hover:shadow-amber-500/10',
	'dark:hover:bg-white/10',
	'dark:hover:shadow-black/30',
	'data-[active=true]:border-indigo-500',
	'data-[active=true]:bg-indigo-50/80',
	'data-[active=true]:text-indigo-800',
	'data-[active=true]:hover:bg-indigo-50/80',
	'data-[active=true]:hover:shadow-lg',
	'dark:data-[active=true]:border-indigo-300/60',
	'dark:data-[active=true]:bg-indigo-500/20',
	'dark:data-[active=true]:text-white',
	'dark:data-[active=true]:hover:bg-indigo-500/20',
] as const;

export const PHASE_LIST_ITEM_CONTENT_CLASS_NAMES = [
	'flex',
	'w-full',
	'items-center',
	'gap-3',
] as const;

export const PHASE_INDEX_WRAPPER_CLASS_NAMES = [
	'relative',
	'grid',
	'h-10',
	'w-10',
	'place-items-center',
	'overflow-hidden',
	'rounded-2xl',
	'bg-white/70',
	'shadow-inner',
	'shadow-white/60',
	'ring-1',
	'ring-inset',
	'ring-white/70',
	'backdrop-blur-[2px]',
	'transition-all',
	'duration-300',
	'ease-out',
	'dark:bg-white/10',
	'dark:shadow-black/40',
	'dark:ring-white/10',
	'data-[active=true]:bg-gradient-to-br',
	'data-[active=true]:from-indigo-500/90',
	'data-[active=true]:via-indigo-500/80',
	'data-[active=true]:to-fuchsia-500/80',
	'data-[active=true]:shadow-lg',
	'data-[active=true]:ring-indigo-200/80',
	'dark:data-[active=true]:ring-indigo-300/60',
] as const;

export const PHASE_INDEX_HIGHLIGHT_CLASS_NAMES = [
	'pointer-events-none',
	'absolute',
	'inset-0',
	'rounded-2xl',
	'bg-gradient-to-br',
	'from-white/70',
	'via-white/30',
	'to-transparent',
	'opacity-0',
	'transition-opacity',
	'duration-300',
	'ease-out',
	'data-[active=true]:opacity-60',
	'dark:from-white/40',
	'dark:via-white/5',
] as const;

export const PHASE_INDEX_TEXT_CLASS_NAMES = [
	'relative',
	'text-xs',
	'font-semibold',
	'uppercase',
	'tracking-[0.35em]',
	'text-indigo-600',
	'transition-colors',
	'duration-300',
	'ease-out',
	'data-[active=true]:text-white',
	'dark:text-indigo-200',
	'dark:data-[active=true]:text-white',
	'font-mono',
	'tabular-nums',
] as const;

export const PHASE_ICON_CLASS_NAMES = [
	'grid',
	'h-9',
	'w-9',
	'place-items-center',
	'rounded-xl',
	'bg-white/80',
	'text-base',
	'text-indigo-600',
	'shadow-inner',
	'dark:bg-white/10',
	'dark:text-indigo-200',
] as const;

export const PHASE_LABEL_CLASS_NAMES = [
	'flex-1',
	'text-xs',
	'uppercase',
	'tracking-[0.2em]',
] as const;

export const joinClassNames = (classNames: readonly string[]) =>
	classNames.join(' ');

export const PANEL_CLASSES = joinClassNames(PANEL_CLASS_NAMES);
export const HEADER_CLASSES = joinClassNames(HEADER_CLASS_NAMES);
export const TURN_SUMMARY_CLASSES = joinClassNames(TURN_SUMMARY_CLASS_NAMES);
export const TURN_BADGE_CLASSES = joinClassNames(TURN_BADGE_CLASS_NAMES);
export const PLAYER_DETAILS_CLASSES = joinClassNames(
	PLAYER_DETAILS_CLASS_NAMES,
);
export const PLAYER_LABEL_CLASSES = joinClassNames(PLAYER_LABEL_CLASS_NAMES);
export const PLAYER_NAME_CLASSES = joinClassNames(PLAYER_NAME_CLASS_NAMES);
export const PHASE_SECTION_CLASSES = joinClassNames(PHASE_SECTION_CLASS_NAMES);
export const PHASE_LIST_CLASSES = joinClassNames(PHASE_LIST_CLASS_NAMES);
export const PHASE_LIST_ITEM_CLASSES = joinClassNames(
	PHASE_LIST_ITEM_CLASS_NAMES,
);
export const PHASE_LIST_ITEM_CONTENT_CLASSES = joinClassNames(
	PHASE_LIST_ITEM_CONTENT_CLASS_NAMES,
);
export const PHASE_INDEX_WRAPPER_CLASSES = joinClassNames(
	PHASE_INDEX_WRAPPER_CLASS_NAMES,
);
export const PHASE_INDEX_HIGHLIGHT_CLASSES = joinClassNames(
	PHASE_INDEX_HIGHLIGHT_CLASS_NAMES,
);
export const PHASE_INDEX_TEXT_CLASSES = joinClassNames(
	PHASE_INDEX_TEXT_CLASS_NAMES,
);
export const PHASE_ICON_CLASSES = joinClassNames(PHASE_ICON_CLASS_NAMES);
export const PHASE_LABEL_CLASSES = joinClassNames(PHASE_LABEL_CLASS_NAMES);
