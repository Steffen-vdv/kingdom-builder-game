import React from 'react';
import BlockingScreen from '../common/BlockingScreen';
import Button from '../common/Button';

interface SessionExpiredScreenProps {
	onStartNewGame: () => void;
	onExit?: () => void;
}

export default function SessionExpiredScreen({
	onStartNewGame,
	onExit,
}: SessionExpiredScreenProps) {
	return (
		<BlockingScreen
			title="Session Expired"
			description="Your game session timed out due to inactivity."
		>
			<p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
				The server clears idle sessions after 15 minutes to free up resources.
				You can start a new game to continue playing.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-4">
				<Button onClick={onStartNewGame} variant="primary" icon="🎮">
					Start New Game
				</Button>
				{onExit ? (
					<Button onClick={onExit} variant="secondary" icon="🏠">
						Return to Menu
					</Button>
				) : null}
			</div>
		</BlockingScreen>
	);
}
