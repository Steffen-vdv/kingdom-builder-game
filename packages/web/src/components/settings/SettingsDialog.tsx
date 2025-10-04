import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import Button from '../common/Button';
import ToggleSwitch from '../common/ToggleSwitch';

const DIALOG_SURFACE_CLASS = [
	'relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/20',
	'bg-gradient-to-br from-white/98 via-white/95 to-white/90 p-8 text-slate-900 shadow-2xl shadow-slate-900/40',
	'dark:border-white/10 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/85 dark:text-slate-100',
].join(' ');

const ACCENT_GLOW_CLASS = [
	'absolute -top-12 right-8 h-24 w-24 rounded-full bg-emerald-400/30 blur-3xl',
	'dark:bg-emerald-500/30',
].join(' ');

const SETTING_ROW_CLASS = [
	'flex items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/85 px-6 py-5',
	'shadow-inner shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30',
].join(' ');

const SETTING_TITLE_CLASS = [
	'text-sm font-semibold uppercase tracking-wide text-slate-700',
	'dark:text-slate-200',
].join(' ');

const SETTING_DESCRIPTION_CLASS = [
	'mt-2 text-sm text-slate-600',
	'dark:text-slate-300/80',
].join(' ');

const DIALOG_DESCRIPTION = [
	'Tune the ambience and visuals of your kingdom.',
	'These selections stay with you as you explore different screens.',
].join(' ');

interface SettingsDialogProps {
	open: boolean;
	onClose: () => void;
	darkMode: boolean;
	onToggleDark: () => void;
	musicEnabled: boolean;
	onToggleMusic: () => void;
	soundEnabled: boolean;
	onToggleSound: () => void;
}

interface SettingRowProps {
	id: string;
	title: string;
	description: string;
	checked: boolean;
	onToggle: () => void;
}

function SettingRow({
	id,
	title,
	description,
	checked,
	onToggle,
}: SettingRowProps) {
	return (
		<div className={SETTING_ROW_CLASS}>
			<div className="max-w-[75%] text-left">
				<h3 id={`${id}-label`} className={SETTING_TITLE_CLASS}>
					{title}
				</h3>
				<p className={SETTING_DESCRIPTION_CLASS}>{description}</p>
			</div>
			<ToggleSwitch
				checked={checked}
				onChange={() => onToggle()}
				aria-labelledby={`${id}-label`}
			/>
		</div>
	);
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
}: SettingsDialogProps) {
	useEffect(() => {
		if (!open || typeof window === 'undefined') {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
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
			<div className={DIALOG_SURFACE_CLASS}>
				<div className={ACCENT_GLOW_CLASS} />
				<header className="relative mb-6">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
						Realm Preferences
					</p>
					<h2 className="mt-2 text-2xl font-bold tracking-tight">Settings</h2>
					<p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300/80">
						{DIALOG_DESCRIPTION}
					</p>
				</header>
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
						description={'Toggle sound effects. (Coming soon)'}
						checked={soundEnabled}
						onToggle={onToggleSound}
					/>
					<SettingRow
						id="settings-theme"
						title="Dark mode"
						description="Switch between bright parchment tones and moonlit hues."
						checked={darkMode}
						onToggle={onToggleDark}
					/>
				</div>
				<div className="mt-8 flex justify-end">
					<Button variant="ghost" onClick={onClose} className="px-6">
						Close
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
