import React, { useCallback, useMemo, useState } from 'react';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';
import HoverCard from './components/HoverCard';
import ActionsPanel from './components/actions/ActionsPanel';
import PhasePanel from './components/phases/PhasePanel';
import LogPanel from './components/LogPanel';
import Button from './components/common/Button';
import TimeControl from './components/common/TimeControl';
import ErrorToaster from './components/common/ErrorToaster';
import ConfirmDialog from './components/common/ConfirmDialog';
import SettingsDialog from './components/settings/SettingsDialog';

function GameLayout() {
	const {
		ctx,
		onExit,
		darkMode,
		onToggleDark,
		musicEnabled,
		onToggleMusic,
		soundEnabled,
		onToggleSound,
	} = useGameEngine();
	const [isQuitDialogOpen, setQuitDialogOpen] = useState(false);
	const [isSettingsOpen, setSettingsOpen] = useState(false);
	const requestQuit = useCallback(() => {
		if (!onExit) {
			return;
		}
		setQuitDialogOpen(true);
	}, [onExit]);
	const closeDialog = useCallback(() => {
		setQuitDialogOpen(false);
	}, []);
	const confirmExit = useCallback(() => {
		if (!onExit) {
			return;
		}
		setQuitDialogOpen(false);
		onExit();
	}, [onExit]);
	const [playerHeights, setPlayerHeights] = useState<Record<string, number>>(
		{},
	);
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
				className={`grow basis-[calc(50%-1rem)] max-w-[calc(50%-1rem)] p-4 ${bgClass}`}
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
	return (
		<div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-amber-100 via-rose-100 to-sky-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
			<SettingsDialog
				open={isSettingsOpen}
				onClose={() => setSettingsOpen(false)}
				darkMode={darkMode}
				onToggleDark={onToggleDark}
				musicEnabled={musicEnabled}
				onToggleMusic={onToggleMusic}
				soundEnabled={soundEnabled}
				onToggleSound={onToggleSound}
			/>
			<ConfirmDialog
				open={isQuitDialogOpen}
				title="Leave the battlefield?"
				description="If you quit now, the current game will end and any progress will be lost. Are you sure you want to retreat?"
				confirmLabel="Quit game"
				cancelLabel="Continue playing"
				onCancel={closeDialog}
				onConfirm={confirmExit}
			/>
			<ErrorToaster />
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/20" />
				<div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/20" />
				<div className="absolute top-1/4 right-0 h-72 w-72 translate-x-1/3 rounded-full bg-rose-300/30 blur-3xl dark:bg-rose-500/20" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_rgba(255,255,255,0)_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.6),_rgba(15,23,42,0)_60%)]" />
			</div>

			<div className="relative z-10 flex min-h-screen flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
				<div className="mb-4 flex items-center justify-between rounded-3xl border border-white/50 bg-white/70 px-6 py-4 shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/40 frosted-surface">
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Kingdom Builder
					</h1>
					{onExit && (
						<div className="ml-4 flex items-center gap-3">
							<TimeControl />
							<Button
								onClick={() => setSettingsOpen(true)}
								variant="secondary"
								aria-label="Open settings"
								title="Settings"
								className="h-10 w-10 rounded-full p-0 text-lg shadow-lg shadow-slate-900/10 dark:shadow-black/30"
							>
								<span aria-hidden>⚙️</span>
							</Button>
							<Button
								onClick={requestQuit}
								variant="danger"
								className="rounded-full px-4 py-2 text-sm font-semibold shadow-lg shadow-rose-500/30"
							>
								Quit
							</Button>
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 gap-y-6 gap-x-6 lg:grid-cols-[minmax(0,1fr)_30rem]">
					<section className="relative flex min-h-[275px] items-stretch rounded-3xl bg-white/70 shadow-2xl dark:bg-slate-900/70 dark:shadow-slate-900/50 frosted-surface">
						<div className="flex flex-1 items-stretch gap-6 overflow-hidden rounded-3xl px-6 py-6">
							{playerPanels}
						</div>
					</section>
					{phasePanelElement}
					<div className="lg:col-start-1 lg:row-start-2">
						<ActionsPanel />
					</div>
					<div className="flex w-full flex-col gap-6 lg:col-start-2 lg:row-start-2">
						<LogPanel />
						<HoverCard />
					</div>
				</div>
			</div>
		</div>
	);
}

export default function Game({
	onExit,
	darkMode = true,
	onToggleDark = () => {},
	devMode = false,
	musicEnabled = true,
	onToggleMusic = () => {},
	soundEnabled = true,
	onToggleSound = () => {},
}: {
	onExit?: () => void;
	darkMode?: boolean;
	onToggleDark?: () => void;
	devMode?: boolean;
	musicEnabled?: boolean;
	onToggleMusic?: () => void;
	soundEnabled?: boolean;
	onToggleSound?: () => void;
}) {
	return (
		<GameProvider
			{...(onExit ? { onExit } : {})}
			darkMode={darkMode}
			onToggleDark={onToggleDark}
			devMode={devMode}
			musicEnabled={musicEnabled}
			onToggleMusic={onToggleMusic}
			soundEnabled={soundEnabled}
			onToggleSound={onToggleSound}
		>
			<GameLayout />
		</GameProvider>
	);
}
