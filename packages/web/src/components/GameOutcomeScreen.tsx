import React, { useMemo } from 'react';
import Button from './common/Button';
import { WIN_CONDITIONS } from '@kingdom-builder/contents';
import { useGameEngine } from '../state/GameContext';

function buildResultLine(
	didWin: boolean,
	didLose: boolean,
	winners: Set<string>,
	losers: Set<string>,
	players: { id: string; name: string }[],
): string | null {
	const winnerNames = players
		.filter((player) => winners.has(player.id))
		.map((player) => player.name)
		.join(' & ');
	const loserNames = players
		.filter((player) => losers.has(player.id))
		.map((player) => player.name)
		.join(' & ');
	if (didWin && loserNames) {
		return `You defeated ${loserNames}.`;
	}
	if (didLose && winnerNames) {
		return `${winnerNames} claimed victory.`;
	}
	if (winnerNames && loserNames) {
		return `${winnerNames} prevailed over ${loserNames}.`;
	}
	return null;
}

export default function GameOutcomeScreen() {
	const { sessionState, onExit } = useGameEngine();
	const outcome = sessionState.game.outcome;
	const players = sessionState.game.players;
	const localPlayer = players[0];
	const perspectiveId = localPlayer?.id ?? null;
	const winners = useMemo(
		() => new Set(outcome?.winners ?? []),
		[outcome?.winners],
	);
	const losers = useMemo(
		() => new Set(outcome?.losers ?? []),
		[outcome?.losers],
	);
	if (!outcome) {
		return null;
	}
	const didWin = perspectiveId ? winners.has(perspectiveId) : false;
	const didLose = perspectiveId ? losers.has(perspectiveId) : false;
	const definition = WIN_CONDITIONS.find(
		(entry) => entry.id === outcome.conditionId,
	);
	const display = didWin
		? definition?.display?.winner
		: didLose
			? definition?.display?.loser
			: undefined;
	const icon = definition?.display?.icon;
	const title =
		display?.title ?? (didWin ? 'Victory!' : didLose ? 'Defeat' : 'Game Over');
	const description =
		display?.description ??
		(didWin
			? 'Your realm stands triumphant.'
			: didLose
				? 'Your castle has fallen.'
				: 'The battle has ended.');
	const resultLine = buildResultLine(didWin, didLose, winners, losers, players);
	const handleExit = () => {
		if (onExit) {
			onExit();
			return;
		}
		window.location.reload();
	};
	return (
		<div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md">
			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				className="mx-4 w-full max-w-lg rounded-3xl border border-white/20 bg-white/95 p-10 text-center shadow-2xl dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-100 frosted-surface"
			>
				{icon ? (
					<div className="mb-4 flex justify-center text-5xl">{icon}</div>
				) : null}
				<h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
				<p className="mt-4 text-base text-slate-600 dark:text-slate-300">
					{description}
				</p>
				{resultLine ? (
					<p className="mt-4 text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">
						{resultLine}
					</p>
				) : null}
				<Button
					onClick={handleExit}
					className="mt-8"
					icon="🏠"
					variant="primary"
				>
					Return to Main Screen
				</Button>
			</div>
		</div>
	);
}
