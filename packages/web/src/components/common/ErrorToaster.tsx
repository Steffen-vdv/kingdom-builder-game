import React from 'react';
import { useGameEngine } from '../../state/GameContext';

export default function ErrorToaster() {
	const { errorToasts, dismissErrorToast } = useGameEngine();
	if (errorToasts.length === 0) {
		return null;
	}
	return (
		<div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-3">
			{errorToasts.map((toast) => (
				<div
					key={toast.id}
					className="pointer-events-auto w-72 max-w-full rounded-xl border border-rose-200/60 bg-rose-600/95 text-white shadow-xl ring-1 ring-rose-400/40 backdrop-blur dark:border-rose-500/40 dark:bg-rose-700/95"
				>
					<div className="flex items-start gap-3 p-4">
						<span aria-hidden="true" className="text-2xl leading-none">
							⚠️
						</span>
						<div className="flex-1">
							<p className="text-xs font-semibold uppercase tracking-wide text-rose-100/80">
								Action failed
							</p>
							<p className="mt-1 text-sm leading-5">{toast.message}</p>
						</div>
						<button
							type="button"
							onClick={() => dismissErrorToast(toast.id)}
							className="ml-2 rounded-full p-1 text-rose-100/80 transition hover:bg-rose-500/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
							aria-label="Dismiss error notification"
						>
							×
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
