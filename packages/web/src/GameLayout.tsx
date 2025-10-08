import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from './components/common/Button';
import ConfirmDialog from './components/common/ConfirmDialog';
import TimeControl from './components/common/TimeControl';
import Toaster from './components/common/Toaster';
import ActionsPanel from './components/actions/ActionsPanel';
import HoverCard from './components/HoverCard';
import LogPanel from './components/LogPanel';
import PhasePanel from './components/phases/PhasePanel';
import PlayerPanel from './components/player/PlayerPanel';
import SettingsDialog from './components/settings/SettingsDialog';
import { useGameEngine } from './state/GameContext';
import GameOutcomeScreen from './components/GameOutcomeScreen';

export default function GameLayout() {
	const {
		ctx,
		onExit,
		darkMode,
		onToggleDark,
		musicEnabled,
		onToggleMusic,
		soundEnabled,
		onToggleSound,
		backgroundAudioMuted,
		onToggleBackgroundAudioMute,
		playerName,
		onChangePlayerName,
	} = useGameEngine();
	const [isQuitDialogOpen, setQuitDialogOpen] = useState(false);
	const [isSettingsOpen, setSettingsOpen] = useState(false);
	const [isLogOpen, setLogOpen] = useState(false);
	const requestQuit = useCallback(() => {
		if (!onExit) {
			return;
		}
		setQuitDialogOpen(true);
	}, [onExit]);
	const closeDialog = useCallback(() => {
		setQuitDialogOpen(false);
	}, []);
	const toggleLog = useCallback(() => {
		setLogOpen((prev) => !prev);
	}, []);
	const closeLog = useCallback(() => {
		setLogOpen(false);
	}, []);
	const confirmExit = useCallback(() => {
		if (!onExit) {
			return;
		}
		setQuitDialogOpen(false);
		onExit();
	}, [onExit]);
	const playerAreaRef = useRef<HTMLElement | null>(null);
	const [phasePanelHeight, setPhasePanelHeight] = useState(320);
	useEffect(() => {
		const node = playerAreaRef.current;
		if (!node) {
			return;
		}

		let frame = 0;
		const updateHeight = () => {
			if (!playerAreaRef.current) {
				return;
			}
			const { height } = playerAreaRef.current.getBoundingClientRect();
			setPhasePanelHeight((prev) => {
				const nextHeight = Math.max(320, Math.ceil(height));
				if (prev === nextHeight) {
					return prev;
				}
				return nextHeight;
			});
		};

		updateHeight();

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', updateHeight);
			return () => {
				window.removeEventListener('resize', updateHeight);
			};
		}

		const observer = new ResizeObserver(() => {
			frame = window.requestAnimationFrame(updateHeight);
		});

		observer.observe(node);

		return () => {
			observer.disconnect();
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
		};
	}, [ctx.game.players.length]);
	const playerPanels = ctx.game.players.map((player, index) => {
		const isActive = player.id === ctx.activePlayer.id;
		const sideClass = index === 0 ? 'pr-6' : 'pl-6';
		const colorClass =
			index === 0
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
				key={player.id}
				player={player}
				className={`grow basis-[calc(50%-1rem)] max-w-[calc(50%-1rem)] p-4 ${bgClass}`}
				isActive={isActive}
			/>
		);
	});
	const phasePanelElement = (
		<div className="w-full lg:col-start-2">
			<PhasePanel height={phasePanelHeight} />
		</div>
	);
	const logButton = (
		<Button
			onClick={toggleLog}
			variant="secondary"
			icon="📜"
			aria-pressed={isLogOpen}
			aria-expanded={isLogOpen}
			aria-controls="game-log-panel"
		>
			Log
		</Button>
	);
	const settingsButton = (
		<Button onClick={() => setSettingsOpen(true)} variant="secondary" icon="⚙️">
			Settings
		</Button>
	);
	const quitButton = (
		<Button onClick={requestQuit} variant="danger" icon="🏳️">
			Quit Game
		</Button>
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
				backgroundAudioMuted={backgroundAudioMuted}
				onToggleBackgroundAudioMute={onToggleBackgroundAudioMute}
				playerName={playerName}
				onChangePlayerName={onChangePlayerName}
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
			<Toaster />
			<GameOutcomeScreen />
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/20" />
				<div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/20" />
				<div className="absolute top-1/4 right-0 h-72 w-72 translate-x-1/3 rounded-full bg-rose-300/30 blur-3xl dark:bg-rose-500/20" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_rgba(255,255,255,0)_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.6),_rgba(15,23,42,0)_60%)]" />
			</div>

			<div className="relative z-10 flex min-h-screen flex-col gap-8 px-4 py-8 sm:px-8 lg:px-12">
				<div className="flex items-center justify-between rounded-3xl border border-white/50 bg-white/70 px-6 py-4 shadow-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/40 frosted-surface">
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Kingdom Builder
					</h1>
					{onExit && (
						<div className="ml-4 flex items-center gap-3">
							{logButton}
							<TimeControl />
							{settingsButton}
							{quitButton}
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 gap-y-8 gap-x-6 lg:grid-cols-[minmax(0,1fr)_30rem]">
					<section
						ref={playerAreaRef}
						className="relative flex min-h-[275px] items-stretch rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-slate-900/50 frosted-surface"
					>
						<div className="flex flex-1 items-stretch gap-6">
							{playerPanels}
						</div>
					</section>
					{phasePanelElement}
					<div className="lg:col-start-1 lg:row-start-2">
						<ActionsPanel />
					</div>
					<div className="lg:col-start-2 lg:row-start-2">
						<HoverCard />
					</div>
				</div>
				<LogPanel isOpen={isLogOpen} onClose={closeLog} />
			</div>
		</div>
	);
}
