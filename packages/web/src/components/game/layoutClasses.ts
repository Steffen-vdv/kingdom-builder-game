export const GAME_BACKGROUND_CLASS = [
	'relative min-h-screen w-full overflow-hidden',
	'bg-gradient-to-br from-amber-100 via-rose-100 to-sky-100',
	'text-slate-900 dark:from-slate-950 dark:via-slate-900',
	'dark:to-slate-950 dark:text-slate-100',
].join(' ');

export const GAME_OVERLAY_CLASS = 'pointer-events-none absolute inset-0';

export const GAME_LIGHTING_CLASS = [
	'absolute inset-0',
	'bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_rgba(255,255,255,0)_55%)]',
	'dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.6),_rgba(15,23,42,0)_60%)]',
].join(' ');

export const GAME_BUBBLE_TOP_CLASS = [
	'absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full',
	'bg-amber-300/30 blur-3xl dark:bg-amber-500/20',
].join(' ');

export const GAME_BUBBLE_BOTTOM_CLASS = [
	'absolute -bottom-28 -left-16 h-80 w-80 rounded-full',
	'bg-sky-300/30 blur-3xl dark:bg-sky-500/20',
].join(' ');

export const GAME_BUBBLE_RIGHT_CLASS = [
	'absolute top-1/4 right-0 h-72 w-72 translate-x-1/3 rounded-full',
	'bg-rose-300/30 blur-3xl dark:bg-rose-500/20',
].join(' ');

export const LOADING_CARD_CLASS = [
	'w-full max-w-md rounded-3xl border border-white/60 bg-white/80 px-6 py-8',
	'text-center shadow-2xl dark:border-white/10 dark:bg-slate-900/70',
	'dark:shadow-slate-900/40',
].join(' ');

export const LOADING_WRAPPER_CLASS = [
	'relative z-10 flex min-h-screen items-center justify-center px-4',
].join(' ');

export const LOADING_TITLE_CLASS = 'text-xl font-semibold tracking-tight';

export const LOADING_TEXT_CLASS = [
	'mt-3 text-sm text-slate-600',
	'dark:text-slate-300',
].join(' ');

export const GAME_CONTENT_CLASS = [
	'relative z-10 flex min-h-screen flex-col gap-8',
	'px-4 py-8 sm:px-8 lg:px-12',
].join(' ');

export const GAME_HEADER_CARD_CLASS = [
	'mb-4 flex items-center justify-between rounded-3xl',
	'border border-white/50 bg-white/70 px-6 py-4 shadow-xl',
	'dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/40',
	'frosted-surface',
].join(' ');

export const GAME_TOGGLE_BUTTON_CLASS = [
	'rounded-full px-4 py-2 text-sm font-semibold shadow-lg',
	'shadow-slate-900/10 dark:shadow-black/30',
].join(' ');

export const GAME_QUIT_BUTTON_CLASS = [
	'rounded-full px-4 py-2 text-sm font-semibold shadow-lg',
	'shadow-rose-500/30',
].join(' ');

export const GAME_GRID_CLASS = [
	'grid grid-cols-1 gap-y-6 gap-x-6',
	'lg:grid-cols-[minmax(0,1fr)_30rem]',
].join(' ');

export const PRIMARY_COLUMN_CLASS = 'lg:col-start-1 lg:row-start-2';

export const GAME_PLAYER_SECTION_CLASS = [
	'relative flex min-h-[275px] items-stretch rounded-3xl',
	'bg-white/70 shadow-2xl dark:bg-slate-900/70',
	'dark:shadow-slate-900/50 frosted-surface',
].join(' ');

export const PLAYER_PANEL_WRAPPER_CLASS = [
	'flex flex-1 items-stretch overflow-hidden rounded-3xl',
	'divide-x divide-white/50 dark:divide-white/10',
].join(' ');

export const SECONDARY_COLUMN_CLASS = [
	'flex w-full flex-col gap-6',
	'lg:col-start-2 lg:row-start-2',
].join(' ');

export const HEADER_TITLE_CLASS = [
	'text-2xl font-bold tracking-tight',
	'sm:text-3xl',
].join(' ');

export const QUIT_NOTE_CLASS = [
	'text-xs text-slate-500',
	'dark:text-slate-400',
].join(' ');

export const HEADER_CONTROLS_CLASS = 'ml-4 flex items-center gap-3';
