import React from 'react';
import type {
	SessionGameConclusionSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import Button from '../common/Button';
import { useResourceMetadata } from '../../contexts/RegistryMetadataContext';
import { toDescriptorDisplay } from '../player/registryDisplays';

interface GameConclusionOverlayProps {
	conclusion: SessionGameConclusionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	sessionSnapshot: SessionSnapshot;
	onExit?: (() => void) | undefined;
}

export default function GameConclusionOverlay({
	conclusion,
	ruleSnapshot,
	sessionSnapshot,
	onExit,
}: GameConclusionOverlayProps) {
	const resourceMetadata = useResourceMetadata();
	const localPlayer = sessionSnapshot.game.players[0];
	if (!localPlayer) {
		return null;
	}
	const playerWon = conclusion.winnerId === localPlayer.id;
	const condition = ruleSnapshot.winConditions.find(
		(entry) => entry.id === conclusion.conditionId,
	);
	const message = playerWon
		? (condition?.display?.victory ?? 'You stand victorious.')
		: (condition?.display?.defeat ?? 'Defeat has taken the realm.');
	const iconKey = condition?.display?.icon;
	let icon: string | undefined;
	if (iconKey) {
		const descriptor = resourceMetadata.byId[iconKey];
		if (descriptor) {
			const display = toDescriptorDisplay(descriptor);
			icon = display.icon ?? '🏁';
		} else if (iconKey.trim().length > 0) {
			icon = iconKey;
		}
	}
	if (!icon) {
		icon = '🏁';
	}
	const title = playerWon ? 'Victory' : 'Defeat';

	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/80 backdrop-blur">
			<div className="mx-4 w-full max-w-xl rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-2xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-900/60 frosted-surface">
				<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/60 text-4xl shadow-inner dark:bg-slate-800/70">
					<span aria-hidden="true">{icon}</span>
				</div>
				<h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
					{title}
				</h2>
				<p className="mt-4 text-lg text-slate-700 dark:text-slate-200">
					{message}
				</p>
				{onExit && (
					<div className="mt-8 flex justify-center">
						<Button onClick={onExit} variant="primary" icon="🏰">
							Return to Main Menu
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
