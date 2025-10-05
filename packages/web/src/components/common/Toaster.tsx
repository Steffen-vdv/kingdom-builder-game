import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import type { ToastVariant } from '../../state/useToasts';

const TOASTER_POSITION_CLASS = [
	'pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-3',
].join(' ');

const CARD_BASE_CLASS = [
	'pointer-events-auto w-72 max-w-full rounded-xl border shadow-xl ring-1',
	'backdrop-blur transition',
].join(' ');

const TITLE_BASE_CLASS = 'text-xs font-semibold uppercase tracking-wide';
const MESSAGE_CLASS = 'mt-1 text-sm leading-5';
const ICON_CLASS = 'text-2xl leading-none';
const DISMISS_BUTTON_BASE_CLASS = [
	'ml-2 rounded-full p-1 transition focus:outline-none focus:ring-2',
].join(' ');

const VARIANT_META: Record<
	ToastVariant,
	{
		container: string;
		title: string;
		icon: string;
		dismiss: string;
		dismissLabel: string;
	}
> = {
	error: {
		container: [
			'border-rose-200/60 bg-rose-600/95 text-white ring-rose-400/40',
			'dark:border-rose-500/40 dark:bg-rose-700/95',
		].join(' '),
		title: 'text-rose-100/80',
		icon: '⚠️',
		dismiss: [
			'text-rose-100/80 hover:bg-rose-500/40 hover:text-white',
			'focus:ring-white/70',
		].join(' '),
		dismissLabel: 'Dismiss error notification',
	},
	success: {
		container: [
			'border-emerald-200/60 bg-emerald-600/95 text-white ring-emerald-400/40',
			'dark:border-emerald-500/40 dark:bg-emerald-700/95',
		].join(' '),
		title: 'text-emerald-100/80',
		icon: '✨',
		dismiss: [
			'text-emerald-100/80 hover:bg-emerald-500/40 hover:text-white',
			'focus:ring-white/70',
		].join(' '),
		dismissLabel: 'Dismiss notification',
	},
};

export default function Toaster() {
	const { toasts, dismissToast } = useGameEngine();
	if (toasts.length === 0) {
		return null;
	}

	return (
		<div className={TOASTER_POSITION_CLASS}>
			{toasts.map((toast) => {
				const variant = VARIANT_META[toast.variant];
				return (
					<div
						key={toast.id}
						className={`${CARD_BASE_CLASS} ${variant.container}`}
					>
						<div className="flex items-start gap-3 p-4">
							<span aria-hidden="true" className={ICON_CLASS}>
								{variant.icon}
							</span>
							<div className="flex-1">
								<p className={`${TITLE_BASE_CLASS} ${variant.title}`}>
									{toast.title}
								</p>
								<p className={MESSAGE_CLASS}>{toast.message}</p>
							</div>
							<button
								type="button"
								onClick={() => dismissToast(toast.id)}
								className={`${DISMISS_BUTTON_BASE_CLASS} ${variant.dismiss}`}
								aria-label={variant.dismissLabel}
							>
								×
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
