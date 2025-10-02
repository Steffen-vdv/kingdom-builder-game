import React, { useMemo, useState } from 'react';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';
import HoverCard from './components/HoverCard';
import ActionsPanel from './components/actions/ActionsPanel';
import PhasePanel from './components/phases/PhasePanel';
import LogPanel from './components/LogPanel';
import ConfirmDialog from './components/common/ConfirmDialog';
import {
	GAME_BACKGROUND_CLASS,
	GAME_CONTENT_CLASS,
	GAME_GRID_CLASS,
	GAME_HEADER_CARD_CLASS,
	HEADER_TITLE_CLASS,
	GAME_QUIT_BUTTON_CLASS,
	GAME_TOGGLE_BUTTON_CLASS,
	GAME_PLAYER_SECTION_CLASS,
	PRIMARY_COLUMN_CLASS,
	PLAYER_PANEL_WRAPPER_CLASS,
	QUIT_NOTE_CLASS,
	SECONDARY_COLUMN_CLASS,
	LOADING_WRAPPER_CLASS,
} from './components/game/layoutClasses';
import {
	GameBackdrop,
	LoadingCardContent,
	HeaderControls,
} from './components/game/GameLayoutFragments';
import { clearSavedGame, type SavedGame } from './state/persistence';

const LOADING_DESCRIPTION = [
	'Restoring your campaign state.',
	'This may take a moment.',
].join(' ');
const QUIT_DIALOG_PROMPT = [
	'Do you want to keep this campaign to continue later',
	'or discard the save?',
].join(' ');
const QUIT_DIALOG_NOTE = 'Progress is stored at the end of each turn.';

function GameLayout() {
	const engine = useGameEngine();
	const { ctx, onExit } = engine;
	const { darkMode, onToggleDark, initialized } = engine;
	const [playerHeights, setPlayerHeights] = useState<Record<string, number>>(
		{},
	);
	const [quitDialogOpen, setQuitDialogOpen] = useState(false);
	const handleOpenQuitDialog = () => {
		setQuitDialogOpen(true);
	};
	const handleCloseQuitDialog = () => {
		setQuitDialogOpen(false);
	};
	const handlePlayerHeight = (playerId: string, height: number) => {
		setPlayerHeights((prev) => {
			if (prev[playerId] === height) {
				return prev;
			}
			return { ...prev, [playerId]: height };
		});
	};
	const phasePanelHeight = useMemo(() => {
		const heights = Object.values(playerHeights);
		if (!heights.length) {
			return 320;
		}
		return Math.max(320, ...heights);
	}, [playerHeights]);
	const playerPanels = ctx.game.players.map((p, i) => {
		const isActive = p.id === ctx.activePlayer.id;
		const sideClass = i === 0 ? 'pr-6' : 'pl-6';
		const colorClass =
			i === 0
				? isActive
					? 'player-bg-blue-active'
					: 'player-bg-blue'
				: isActive
					? 'player-bg-red-active'
					: 'player-bg-red';
		const bgClass = [
			'player-bg',
			sideClass,
			colorClass,
			isActive ? 'player-bg-animated' : null,
		]
			.filter(Boolean)
			.join(' ');
		return (
			<PlayerPanel
				key={p.id}
				player={p}
				className={`flex-1 p-4 ${bgClass}`}
				isActive={isActive}
				onHeightChange={(height) => {
					handlePlayerHeight(p.id, height);
				}}
			/>
		);
	});
	const phasePanelElement = (
		<div className="w-full lg:col-start-2">
			<PhasePanel height={phasePanelHeight} />
		</div>
	);
	const playerSection = (
		<section className={GAME_PLAYER_SECTION_CLASS}>
			<div className={PLAYER_PANEL_WRAPPER_CLASS}>{playerPanels}</div>
		</section>
	);

	const handleKeepForLater = () => {
		if (onExit) {
			onExit();
		}
	};

	const handleDiscardAndExit = () => {
		clearSavedGame();
		if (onExit) {
			onExit();
		}
	};

	const darkModeButtonProps = {
		onClick: onToggleDark,
		variant: 'secondary' as const,
		className: GAME_TOGGLE_BUTTON_CLASS,
	};

	const quitButtonProps = {
		onClick: handleOpenQuitDialog,
		variant: 'danger' as const,
		className: GAME_QUIT_BUTTON_CLASS,
	};

	const headerControlsProps = {
		darkMode,
		darkModeButtonProps,
		quitButtonProps,
	};

	if (!initialized) {
		return (
			<div className={GAME_BACKGROUND_CLASS}>
				<GameBackdrop />

				<div className={LOADING_WRAPPER_CLASS}>
					<LoadingCardContent description={LOADING_DESCRIPTION} />
				</div>
			</div>
		);
	}

	return (
		<div className={GAME_BACKGROUND_CLASS}>
			<GameBackdrop />

			<div className={GAME_CONTENT_CLASS}>
				<div className={GAME_HEADER_CARD_CLASS}>
					<h1 className={HEADER_TITLE_CLASS}>Kingdom Builder</h1>
					{onExit && <HeaderControls {...headerControlsProps} />}
				</div>

				<div className={GAME_GRID_CLASS}>
					{playerSection}
					{phasePanelElement}
					<div className={PRIMARY_COLUMN_CLASS}>
						<ActionsPanel />
					</div>
					<div className={SECONDARY_COLUMN_CLASS}>
						<LogPanel />
						<HoverCard />
					</div>
				</div>
			</div>

			<ConfirmDialog
				open={quitDialogOpen}
				onClose={handleCloseQuitDialog}
				title="Exit to Main Menu?"
				description={
					<>
						<p>{QUIT_DIALOG_PROMPT}</p>
						<p className={QUIT_NOTE_CLASS}>{QUIT_DIALOG_NOTE}</p>
					</>
				}
				actions={[
					{
						label: 'Keep for later',
						variant: 'primary',
						onClick: handleKeepForLater,
					},
					{
						label: 'Discard save',
						variant: 'danger',
						onClick: handleDiscardAndExit,
					},
				]}
			/>
		</div>
	);
}

export default function Game({
	onExit,
	darkMode = true,
	onToggleDark = () => {},
	devMode = false,
	initialSave = null,
}: {
	onExit?: () => void;
	darkMode?: boolean;
	onToggleDark?: () => void;
	devMode?: boolean;
	initialSave?: SavedGame | null;
}) {
	return (
		<GameProvider
			{...(onExit ? { onExit } : {})}
			darkMode={darkMode}
			onToggleDark={onToggleDark}
			devMode={devMode}
			initialSave={initialSave}
		>
			<GameLayout />
		</GameProvider>
	);
}
