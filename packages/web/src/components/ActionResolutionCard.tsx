import React from 'react';
import type { ActionResolution } from '../state/useActionResolution';
import {
	CARD_BASE_CLASS,
	CARD_META_TEXT_CLASS,
	CARD_TITLE_TEXT_CLASS,
	CONTINUE_BUTTON_CLASS,
	RESOLUTION_LINE_CLASS,
	RESOLUTION_LINES_CLASS,
} from './common/cardStyles';

interface ActionResolutionCardProps {
	title?: string;
	resolution: ActionResolution;
	onContinue: () => void;
}

function ActionResolutionCard({
	title,
	resolution,
	onContinue,
}: ActionResolutionCardProps) {
	const playerLabel = resolution.player?.name ?? resolution.player?.id ?? null;
	const playerName = playerLabel ?? 'Unknown player';
	const containerClass = `${CARD_BASE_CLASS} pointer-events-auto`;
	const headerTitle = title ?? 'Action resolution';

	return (
		<div className={containerClass} data-state="enter">
			<div className="mb-4 space-y-1">
				<div className={CARD_TITLE_TEXT_CLASS}>{headerTitle}</div>
				{resolution.player ? (
					<div className={CARD_META_TEXT_CLASS}>
						{`Played by ${playerName}`}
					</div>
				) : null}
			</div>
			<div className={RESOLUTION_LINES_CLASS}>
				{resolution.visibleLines.map((line, index) => (
					<pre key={index} className={RESOLUTION_LINE_CLASS}>
						{line}
					</pre>
				))}
			</div>
			<div className="mt-6 flex justify-end">
				<button
					type="button"
					onClick={onContinue}
					disabled={!resolution.isComplete}
					className={CONTINUE_BUTTON_CLASS}
				>
					Continue
				</button>
			</div>
		</div>
	);
}

export type { ActionResolutionCardProps };
export { ActionResolutionCard };
