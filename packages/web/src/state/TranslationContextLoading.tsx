import React from 'react';
import BlockingScreen from '../components/common/BlockingScreen';

const translationLoadingSpinnerClass =
	'h-12 w-12 animate-spin rounded-full border-4 border-slate-300 ' +
	'border-t-emerald-500 dark:border-slate-700 dark:border-t-emerald-300';

export default function TranslationContextLoading() {
	return (
		<div aria-busy="true">
			<BlockingScreen
				title="Preparing your kingdom..."
				description="Loading translation details."
			>
				<div className="flex flex-col items-center gap-4">
					<div
						className={translationLoadingSpinnerClass}
						role="status"
						aria-live="polite"
					>
						<span className="sr-only">Loading translation context</span>
					</div>
					<p className="text-sm text-slate-600 dark:text-slate-300">
						Building the royal library...
					</p>
				</div>
			</BlockingScreen>
		</div>
	);
}
