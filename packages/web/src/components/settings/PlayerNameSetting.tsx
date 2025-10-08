import { createPortal } from 'react-dom';
import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useId,
	useState,
} from 'react';
import Button from '../common/Button';
import { useOptionalGameEngine } from '../../state/GameContext';

const DISPLAY_ROW_CLASS = [
	'flex flex-col gap-4 rounded-2xl border border-white/20 bg-white/85 px-6 py-5',
	'text-left shadow-inner shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900/80',
	'dark:shadow-black/30 sm:flex-row sm:items-center sm:justify-between',
].join(' ');

const TITLE_CLASS = [
	'text-sm font-semibold uppercase tracking-wide text-slate-700',
	'dark:text-slate-200',
].join(' ');

const NAME_TEXT_CLASS = [
	'text-lg font-semibold text-slate-900 dark:text-slate-100',
	'truncate max-w-xs sm:max-w-sm',
].join(' ');

const DIALOG_OVERLAY_CLASS = [
	'fixed inset-0 z-50 flex items-center justify-center px-4 py-8',
].join(' ');

const OVERLAY_BACKDROP_CLASS = [
	'absolute inset-0 bg-slate-900/70 backdrop-blur-sm',
].join(' ');

const DIALOG_SURFACE_CLASS = [
	'relative z-10 w-full max-w-md rounded-3xl border border-white/20',
	'bg-gradient-to-br from-white/95 via-white/90 to-white/85 p-7 text-slate-900',
	'shadow-2xl shadow-slate-900/30 dark:border-white/10 dark:from-slate-900/95',
	'dark:via-slate-900/90 dark:to-slate-900/80 dark:text-slate-100',
].join(' ');

const INPUT_FIELD_CLASS = [
	'w-full rounded-full border border-slate-300 bg-white/90 px-5 py-3 text-sm',
	'text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-emerald-400',
	'focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-white/10',
	'dark:bg-slate-900/85 dark:text-slate-100 dark:shadow-black/30',
	'dark:focus:border-emerald-300 dark:focus:ring-emerald-500/40',
].join(' ');

const STATUS_CLASS: Record<'idle' | 'error', string> = {
	idle: 'hidden',
	error: 'text-xs font-semibold text-rose-600 dark:text-rose-400',
};

const ACTIONS_LAYOUT_CLASS = ['mt-6 flex flex-wrap justify-end gap-3'].join(
	' ',
);

interface PlayerNameSettingProps {
	open: boolean;
	playerName: string;
	onSave: (name: string) => void;
}

export function PlayerNameSetting({
	open,
	playerName,
	onSave,
}: PlayerNameSettingProps) {
	const gameEngine = useOptionalGameEngine();
	const pushSuccessToast = gameEngine?.pushSuccessToast;
	const [isDialogOpen, setDialogOpen] = useState(false);

	useEffect(() => {
		if (!open) {
			setDialogOpen(false);
		}
	}, [open]);

	const handleDialogClose = () => {
		setDialogOpen(false);
	};

	const handleDialogOpen = () => {
		setDialogOpen(true);
	};

	return (
		<>
			<div className={DISPLAY_ROW_CLASS}>
				<div className="flex flex-col gap-2">
					<h3 className={TITLE_CLASS}>Player name</h3>
					<span className={NAME_TEXT_CLASS}>{playerName}</span>
				</div>
				<Button
					type="button"
					variant="secondary"
					className="self-start sm:self-auto"
					icon="✏️"
					onClick={handleDialogOpen}
				>
					Change
				</Button>
			</div>
			<PlayerNameDialog
				open={isDialogOpen}
				playerName={playerName}
				onClose={handleDialogClose}
				onSave={onSave}
				pushSuccessToast={pushSuccessToast}
			/>
		</>
	);
}

interface PlayerNameDialogProps {
	open: boolean;
	playerName: string;
	onClose: () => void;
	onSave: (name: string) => void;
	pushSuccessToast?: ((message: string, title?: string) => void) | undefined;
}

function PlayerNameDialog({
	open,
	playerName,
	onClose,
	onSave,
	pushSuccessToast,
}: PlayerNameDialogProps) {
	const inputId = useId();
	const labelId = `${inputId}-label`;
	const [draftName, setDraftName] = useState(playerName);
	const [status, setStatus] = useState<'idle' | 'error'>('idle');
	const [message, setMessage] = useState('');

	useEffect(() => {
		if (!open) {
			return;
		}
		setDraftName(playerName);
		setStatus('idle');
		setMessage('');
	}, [open, playerName]);

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

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		setDraftName(event.target.value);
		setStatus('idle');
		setMessage('');
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = draftName.trim();
		if (!trimmed) {
			setStatus('error');
			setMessage('Please enter a name.');
			return;
		}
		if (trimmed !== playerName) {
			onSave(trimmed);
			pushSuccessToast?.(
				'Your title now echoes across the realm.',
				'Name saved',
			);
		}
		onClose();
	};

	const statusClass = STATUS_CLASS[status];

	if (!open || typeof document === 'undefined') {
		return null;
	}

	return createPortal(
		<div className={DIALOG_OVERLAY_CLASS}>
			<div className={OVERLAY_BACKDROP_CLASS} onClick={onClose} aria-hidden />
			<form
				className={DIALOG_SURFACE_CLASS}
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelId}
				onSubmit={handleSubmit}
				noValidate
			>
				<div className="absolute -top-12 right-8 h-24 w-24 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/30" />
				<h3 id={labelId} className="text-xl font-semibold tracking-tight">
					Change player name
				</h3>
				<label
					className="mt-5 block text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200"
					htmlFor={inputId}
				>
					Player name
				</label>
				<input
					id={inputId}
					className={INPUT_FIELD_CLASS}
					value={draftName}
					onChange={handleChange}
					maxLength={40}
					autoFocus
				/>
				<p
					className={statusClass}
					role={status === 'error' ? 'alert' : undefined}
				>
					{message}
				</p>
				<div className={ACTIONS_LAYOUT_CLASS}>
					<Button
						type="button"
						variant="secondary"
						className="px-5"
						icon="↩️"
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button type="submit" variant="success" className="px-5" icon="💾">
						Save
					</Button>
				</div>
			</form>
		</div>,
		document.body,
	);
}
