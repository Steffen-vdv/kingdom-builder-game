import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';
import Button from '../common/Button';
import { PlayerNameSetting } from './PlayerNameSetting';
import SettingRow from './SettingRow';

import ControlBindingsTab from './ControlBindingsTab';
import type { ControlId, ControlKeybindMap } from '../../state/keybindings';
import { useSoundEffectsContext } from '../../state/SoundEffectsContext';

const DIALOG_SURFACE_CLASS = [
	'relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/20',
	'bg-gradient-to-br from-white/98 via-white/95 to-white/90 p-8 text-slate-900 shadow-2xl shadow-slate-900/40',
	'dark:border-white/10 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/85 dark:text-slate-100',
].join(' ');
const ACCENT_GLOW_CLASS = [
	'absolute -top-12 right-8 h-24 w-24 rounded-full bg-emerald-400/30 blur-3xl',
	'dark:bg-emerald-500/30',
].join(' ');
const DIALOG_DESCRIPTION = [
	'Tune the ambience and visuals of your kingdom.',
	'These selections stay with you as you explore different screens.',
].join(' ');
const TAB_BUTTON_CLASS = [
	'flex-1 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold',
	'tracking-wide transition hoverable cursor-pointer focus:outline-none',
	'focus-visible:ring-2 focus-visible:ring-emerald-300',
	'dark:focus-visible:ring-emerald-500/60',
].join(' ');
const TAB_BUTTON_ACTIVE_CLASS = [
	'bg-emerald-100 text-emerald-900 shadow-sm shadow-emerald-500/20',
	'hover:bg-emerald-200',
	'dark:bg-emerald-500/20 dark:text-emerald-100 dark:shadow-black/40',
	'dark:hover:bg-emerald-500/30',
].join(' ');
const TAB_BUTTON_INACTIVE_CLASS = [
	'bg-white/60 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
	'dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800/70',
	'dark:hover:text-emerald-200',
].join(' ');

type SettingsTabId = 'game' | 'visual' | 'audio' | 'controls';

const SETTINGS_TABS: Array<{ id: SettingsTabId; label: string }> = [
	{ id: 'game', label: 'Game' },
	{ id: 'visual', label: 'Visual' },
	{ id: 'audio', label: 'Audio' },
	{ id: 'controls', label: 'Controls' },
];

const AUTO_ADVANCE_TITLE = 'Auto-advance';

const AUTO_ADVANCE_DESCRIPTION = [
	'Skip manual continue prompts by acknowledging finished actions and',
	'advancing automatically when your turn can proceed.',
].join(' ');

const FOCUSABLE_ELEMENTS_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

interface SettingsDialogProps {
	open: boolean;
	onClose: () => void;
	darkMode: boolean;
	onToggleDark: () => void;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
	backgroundAudioMuted: boolean;
	onToggleBackgroundAudioMute: () => void;
	autoAdvanceEnabled: boolean;
	onToggleAutoAdvance: () => void;
	playerName: string;
	onChangePlayerName: (name: string) => void;
	controlKeybinds: ControlKeybindMap;
	onChangeControlKeybind: (controlId: ControlId, key: string) => void;
	onResetControlKeybind: (controlId: ControlId) => void;
}

export default function SettingsDialog({
	open,
	onClose,
	darkMode,
	onToggleDark,
	musicEnabled,
	onToggleMusic,
	soundEnabled,
	onToggleSound,
	backgroundAudioMuted,
	onToggleBackgroundAudioMute,
	autoAdvanceEnabled,
	onToggleAutoAdvance,
	playerName,
	onChangePlayerName,
	controlKeybinds,
	onChangeControlKeybind,
	onResetControlKeybind,
}: SettingsDialogProps) {
	const [activeTab, setActiveTab] = useState<SettingsTabId>('game');
	const { playUiClick } = useSoundEffectsContext();
	const dialogTitleId = useId();
	const dialogDescriptionId = useId();
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const initialFocusRef = useRef<HTMLButtonElement | null>(null);
	const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!open) {
			return;
		}
		setActiveTab('game');
	}, [open]);

	useEffect(() => {
		if (
			!open ||
			typeof window === 'undefined' ||
			typeof document === 'undefined'
		) {
			return;
		}
		const activeElement = document.activeElement;
		if (activeElement instanceof HTMLElement) {
			previouslyFocusedElementRef.current = activeElement;
		}
		const focusTarget = initialFocusRef.current;
		if (focusTarget) {
			focusTarget.focus();
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!dialogRef.current) {
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== 'Tab') {
				return;
			}
			const focusableElements = Array.from(
				dialogRef.current.querySelectorAll<HTMLElement>(
					FOCUSABLE_ELEMENTS_SELECTOR,
				),
			).filter((element) => {
				if (element.hasAttribute('disabled')) {
					return false;
				}
				if (element.getAttribute('aria-hidden') === 'true') {
					return false;
				}
				return true;
			});
			if (focusableElements.length === 0) {
				event.preventDefault();
				return;
			}
			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];
			if (!firstElement || !lastElement) {
				return;
			}
			const currentlyFocused = document.activeElement;
			if (
				!(currentlyFocused instanceof HTMLElement) ||
				!dialogRef.current.contains(currentlyFocused)
			) {
				event.preventDefault();
				firstElement.focus();
				return;
			}
			if (event.shiftKey) {
				if (currentlyFocused === firstElement) {
					event.preventDefault();
					lastElement.focus();
				}
				return;
			}
			if (currentlyFocused === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			const previouslyFocused = previouslyFocusedElementRef.current;
			if (previouslyFocused && document.contains(previouslyFocused)) {
				previouslyFocused.focus();
			}
			previouslyFocusedElementRef.current = null;
		};
	}, [open, onClose]);

	if (!open || typeof document === 'undefined') {
		return null;
	}

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
			<div
				className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden
			/>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={dialogTitleId}
				aria-describedby={dialogDescriptionId}
				className={DIALOG_SURFACE_CLASS}
			>
				<div className={ACCENT_GLOW_CLASS} />
				<header className="relative mb-6">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
						Realm Preferences
					</p>
					<h2
						id={dialogTitleId}
						className="mt-2 text-2xl font-bold tracking-tight"
					>
						Settings
					</h2>
					<p
						id={dialogDescriptionId}
						className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300/80"
					>
						{DIALOG_DESCRIPTION}
					</p>
				</header>
				<div className="flex flex-col gap-5">
					<div className="flex gap-2 rounded-3xl bg-white/60 p-2 dark:bg-slate-900/70">
						{SETTINGS_TABS.map((tab) => {
							const isActive = activeTab === tab.id;
							return (
								<button
									key={tab.id}
									type="button"
									className={`${TAB_BUTTON_CLASS} ${
										isActive
											? TAB_BUTTON_ACTIVE_CLASS
											: TAB_BUTTON_INACTIVE_CLASS
									}`}
									onClick={() => {
										playUiClick();
										setActiveTab(tab.id);
									}}
									ref={tab.id === 'game' ? initialFocusRef : undefined}
								>
									{tab.label}
								</button>
							);
						})}
					</div>
					{activeTab === 'game' && (
						<div className="flex flex-col gap-4">
							<PlayerNameSetting
								open={open}
								playerName={playerName}
								onSave={onChangePlayerName}
							/>
							<SettingRow
								id="settings-auto-advance"
								title={AUTO_ADVANCE_TITLE}
								description={AUTO_ADVANCE_DESCRIPTION}
								checked={autoAdvanceEnabled}
								onToggle={onToggleAutoAdvance}
							/>
						</div>
					)}
					{activeTab === 'visual' && (
						<div className="flex flex-col gap-4">
							<SettingRow
								id="settings-theme"
								title="Dark mode"
								description="Switch between bright parchment tones and moonlit hues."
								checked={darkMode}
								onToggle={onToggleDark}
							/>
						</div>
					)}
					{activeTab === 'audio' && (
						<div className="flex flex-col gap-4">
							<SettingRow
								id="settings-music"
								title="Background music"
								description="Play a gentle score to accompany your strategy."
								checked={musicEnabled}
								onToggle={onToggleMusic}
							/>
							<SettingRow
								id="settings-sound"
								title="Game sounds"
								description="Toggle sound effects."
								checked={soundEnabled}
								onToggle={onToggleSound}
							/>
							<SettingRow
								id="settings-background-audio"
								title="Play audio in background"
								description="Keep sound active when you switch tabs or windows."
								checked={!backgroundAudioMuted}
								onToggle={onToggleBackgroundAudioMute}
							/>
						</div>
					)}
					{activeTab === 'controls' && (
						<ControlBindingsTab
							keybinds={controlKeybinds}
							onChange={onChangeControlKeybind}
							onReset={onResetControlKeybind}
						/>
					)}
				</div>
				<div className="mt-8 flex justify-end">
					<Button variant="ghost" onClick={onClose} className="px-6" icon="✖️">
						Close
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
