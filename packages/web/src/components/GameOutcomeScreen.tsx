import React from 'react';
import Button from './common/Button';
import type { GameSnapshot } from '@kingdom-builder/engine';

const CONDITION_MESSAGES: Record<
	string,
	{ victory: string; defeat: string; icon?: string }
> = {
	'castle-destroyed': {
		victory:
			'The enemy stronghold lies in ruins. Your banner flies proudly over the battlefield.',
		defeat:
			'Your castle has crumbled. The court scatters as the enemy claims the field.',
		icon: '🏰',
	},
};

function getOutcomeCopy(
	outcome: Extract<GameSnapshot['outcome'], { status: 'finished' }>,
	isVictory: boolean,
) {
	const entry = CONDITION_MESSAGES[outcome.conditionId];
	if (!entry) {
		return {
			icon: isVictory ? '🎖️' : '⚔️',
			message: isVictory
				? 'Your strategy prevailed. The realm celebrates your triumph.'
				: 'Defeat has found you today. Gather strength and plan your return.',
		};
	}
	return {
		icon: entry.icon ?? (isVictory ? '🎖️' : '⚔️'),
		message: isVictory ? entry.victory : entry.defeat,
	};
}

interface GameOutcomeScreenProps {
	outcome: GameSnapshot['outcome'];
	localPlayerId?: string;
	players: Array<{ id: string; name: string }>;
	onExit?: () => void;
}

export default function GameOutcomeScreen({
	outcome,
	localPlayerId,
	players,
	onExit,
}: GameOutcomeScreenProps) {
	if (outcome.status !== 'finished') {
		return null;
	}
	const isVictory = localPlayerId ? outcome.winnerId === localPlayerId : false;
	const title = isVictory ? 'Victory!' : 'Defeat';
	const { icon, message } = getOutcomeCopy(outcome, isVictory);
	const winnerName = players.find(
		(player) => player.id === outcome.winnerId,
	)?.name;
	const loserName = players.find(
		(player) => player.id === outcome.loserId,
	)?.name;
	return (
		<div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-6 text-center text-slate-100">
			<div className="max-w-xl rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 p-10 shadow-2xl backdrop-blur-xl">
				<div className="mb-4 text-5xl">{icon}</div>
				<h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
					{title}
				</h2>
				<p className="mt-4 text-lg leading-relaxed text-slate-200">{message}</p>
				<div className="mt-6 text-sm uppercase tracking-widest text-slate-400">
					{winnerName && loserName
						? `${winnerName} prevailed over ${loserName}`
						: `Condition: ${outcome.conditionId}`}
				</div>
				{onExit && (
					<div className="mt-8 flex justify-center">
						<Button onClick={onExit} variant="primary" icon="🏕️">
							Return to Main Menu
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
