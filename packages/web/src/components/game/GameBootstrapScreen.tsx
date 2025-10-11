import React from 'react';
import BlockingScreen from '../common/BlockingScreen';
import Button from '../common/Button';
import type { SessionFailureDetails } from '../../state/sessionFailures';

interface GameBootstrapScreenProps {
	error: SessionFailureDetails | null;
	onRetry: () => void;
	onExit?: () => void;
}

export default function GameBootstrapScreen({
	error,
	onRetry,
	onExit,
}: GameBootstrapScreenProps) {
	if (!error) {
		return (
			<BlockingScreen
				title="Preparing your kingdom..."
				description="Contacting the game service."
			>
				<p className="text-sm text-slate-300 dark:text-slate-200">
					This will only take a few moments.
				</p>
			</BlockingScreen>
		);
	}
	return (
		<BlockingScreen
			title="We could not load your kingdom."
			description={error.summary}
		>
			<p className="max-w-xl text-sm text-slate-300 dark:text-slate-200">
				Try again in a moment. If the problem continues, send the details below
				to a developer so they can investigate.
			</p>
			<details className="w-full max-w-2xl rounded-lg border border-slate-500/40 bg-slate-900/70 p-4 text-left text-slate-100 shadow-md dark:border-slate-100/10 dark:bg-slate-950/70">
				<summary className="cursor-pointer text-sm font-semibold">
					Technical details
				</summary>
				<pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-200">
					{error.details}
				</pre>
			</details>
			<div className="flex flex-wrap items-center justify-center gap-4">
				<Button onClick={onRetry} variant="primary" icon="↻">
					Try again
				</Button>
				{onExit ? (
					<Button onClick={onExit} variant="secondary" icon="🏠">
						Return to menu
					</Button>
				) : null}
			</div>
		</BlockingScreen>
	);
}
