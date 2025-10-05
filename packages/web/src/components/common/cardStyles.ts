function joinClasses(...classes: (string | null | undefined | false)[]) {
	return classes.filter(Boolean).join(' ');
}

const CARD_BASE_CLASS = [
	'hover-card-transition',
	'w-full',
	'rounded-3xl',
	'border',
	'border-white/60',
	'bg-white/80',
	'p-6',
	'shadow-2xl',
	'shadow-amber-500/10',
	'dark:border-white/10',
	'dark:bg-slate-900/80',
	'dark:shadow-slate-900/60',
	'frosted-surface',
].join(' ');

const RESOLUTION_LINES_CLASS = [
	'space-y-2',
	'text-sm',
	'text-slate-700',
	'dark:text-slate-200',
].join(' ');

const RESOLUTION_LINE_CLASS = [
	'rounded-2xl',
	'bg-white/70',
	'px-4',
	'py-2',
	'font-sans',
	'text-sm',
	'text-slate-800',
	'shadow-inner',
	'shadow-amber-500/10',
	'whitespace-pre-wrap',
	'dark:bg-slate-900/60',
	'dark:text-slate-100',
].join(' ');

const CONTINUE_BUTTON_CLASS = [
	'inline-flex',
	'items-center',
	'justify-center',
	'rounded-2xl',
	'bg-amber-500',
	'px-4',
	'py-2',
	'text-sm',
	'font-semibold',
	'text-white',
	'shadow-lg',
	'shadow-amber-500/40',
	'transition',
	'hover:bg-amber-400',
	'focus:outline-none',
	'focus-visible:ring',
	'focus-visible:ring-amber-500/60',
	'disabled:cursor-not-allowed',
	'disabled:bg-amber-500/60',
	'disabled:shadow-none',
].join(' ');

const CARD_TITLE_TEXT_CLASS = [
	'text-lg',
	'font-semibold',
	'tracking-tight',
	'text-slate-900',
	'dark:text-slate-100',
].join(' ');

const CARD_META_TEXT_CLASS = [
	'text-sm',
	'text-slate-600',
	'dark:text-slate-300',
].join(' ');

const CARD_BODY_TEXT_CLASS = [
	'text-sm',
	'text-slate-700',
	'dark:text-slate-200',
].join(' ');

const CARD_LABEL_CLASS = [
	'text-xs',
	'font-semibold',
	'uppercase',
	'tracking-[0.3em]',
	'text-slate-500',
	'dark:text-slate-300',
].join(' ');

const CARD_LIST_CLASS = [
	'mt-1',
	'list-disc',
	'space-y-1',
	'pl-5',
	'text-sm',
	'text-slate-700',
	'dark:text-slate-200',
].join(' ');

const CARD_ALERT_TEXT_CLASS = [
	'mt-2',
	'text-sm',
	'text-rose-600',
	'dark:text-rose-300',
].join(' ');

const CARD_REQUIREMENT_LIST_CLASS = [
	'mt-1',
	'list-disc',
	'space-y-1',
	'pl-5',
].join(' ');

export {
	CARD_ALERT_TEXT_CLASS,
	CARD_BASE_CLASS,
	CARD_BODY_TEXT_CLASS,
	CARD_LABEL_CLASS,
	CARD_LIST_CLASS,
	CARD_META_TEXT_CLASS,
	CARD_REQUIREMENT_LIST_CLASS,
	CARD_TITLE_TEXT_CLASS,
	CONTINUE_BUTTON_CLASS,
	joinClasses,
	RESOLUTION_LINE_CLASS,
	RESOLUTION_LINES_CLASS,
};
