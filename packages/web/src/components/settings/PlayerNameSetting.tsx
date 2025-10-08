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

const DISPLAY_CARD_CLASS = [
	'flex items-center justify-between gap-4 rounded-2xl border',
	'border-white/20 bg-white/85 px-6 py-5 shadow-inner shadow-slate-900/5',
	'dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30',
].join(' ');

const TITLE_CLASS = [
	'text-sm font-semibold uppercase tracking-wide text-slate-700',
	'dark:text-slate-200',
].join(' ');

const NAME_TEXT_CLASS = [
	'text-base font-semibold text-slate-900',
	'dark:text-slate-100',
].join(' ');

const DIALOG_BACKDROP_CLASS = [
	'absolute inset-0 bg-slate-900/70 backdrop-blur-sm',
].join(' ');

const DIALOG_SURFACE_CLASS = [
	'relative z-10 w-full max-w-md rounded-3xl border border-white/20',
	'bg-gradient-to-br from-white/95 via-white/90 to-white/85 p-8 text-slate-900',
	'shadow-2xl shadow-slate-900/30 dark:border-white/10',
	'dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/85',
	'dark:text-slate-100',
].join(' ');

const INPUT_FIELD_CLASS = [
	'w-full rounded-full border border-slate-300 bg-white/90 px-5 py-3 text-sm',
	'text-slate-900 shadow-inner shadow-slate-900/5 transition',
	'focus:border-emerald-400 focus:outline-none focus:ring-2',
	'focus:ring-emerald-200',
	'dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-100',
	'dark:shadow-black/30 dark:focus:border-emerald-300',
	'dark:focus:ring-emerald-500/40',
].join(' ');

const ERROR_TEXT_CLASS = [
	'text-xs font-semibold text-rose-600',
	'dark:text-rose-400',
].join(' ');

interface PlayerNameSettingProps {
	open: boolean;
	playerName: string;
	onSave: (name: string) => void;
}

interface PlayerNameDialogProps {
	open: boolean;
	initialName: string;
	onClose: () => void;
	onSave: (name: string) => void;
}

function PlayerNameDialog({
	open,
	initialName,
	onClose,
	onSave,
}: PlayerNameDialogProps) {
	const inputId = useId();
	const labelId = `${inputId}-label`;
	const [draftName, setDraftName] = useState(initialName);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) {
			return;
		}
		setDraftName(initialName);
		setError('');
	}, [open, initialName]);

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

	if (typeof document === 'undefined') {
		return null;
	}

	if (!open) {
		return null;
	}

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		setDraftName(event.target.value);
		if (error) {
			setError('');
		}
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = draftName.trim();
		if (!trimmed) {
			setError('Enter a name.');
			return;
		}
		if (trimmed === initialName) {
			onClose();
			return;
		}
		onSave(trimmed);
		onClose();
	};

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
			<div className={DIALOG_BACKDROP_CLASS} onClick={onClose} aria-hidden />
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelId}
				className={DIALOG_SURFACE_CLASS}
			>
				<h2 className="text-xl font-semibold tracking-tight">
					Change player name
				</h2>
				<form
					className="mt-6 flex flex-col gap-4"
					onSubmit={handleSubmit}
					noValidate
				>
					<label
						id={labelId}
						htmlFor={inputId}
						className="text-sm font-semibold"
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
					{error ? (
						<p className={ERROR_TEXT_CLASS} role="alert">
							{error}
						</p>
					) : null}
					<div className="mt-2 flex justify-end gap-3">
						<Button
							type="button"
							variant="secondary"
							onClick={onClose}
							className="px-5"
							icon="↩️"
						>
							Cancel
						</Button>
						<Button type="submit" variant="success" className="px-5" icon="💾">
							Save
						</Button>
					</div>
				</form>
			</div>
		</div>,
		document.body,
	);
}

export function PlayerNameSetting({
	open,
	playerName,
	onSave,
}: PlayerNameSettingProps) {
	const gameEngine = useOptionalGameEngine();
	const pushSuccessToast = gameEngine?.pushSuccessToast;
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	useEffect(() => {
		if (!open) {
			setIsDialogOpen(false);
		}
	}, [open]);

	const handleSave = (name: string) => {
		onSave(name);
		pushSuccessToast?.('Player name updated.', 'Saved');
	};

	return (
		<>
			<div className={DISPLAY_CARD_CLASS}>
				<div className="text-left">
					<h3 className={TITLE_CLASS}>Player name</h3>
					<p className={NAME_TEXT_CLASS} aria-live="polite">
						{playerName}
					</p>
				</div>
				<Button
					type="button"
					variant="secondary"
					onClick={() => setIsDialogOpen(true)}
					className="sm:w-auto"
					icon="✏️"
				>
					Change
				</Button>
			</div>
			<PlayerNameDialog
				open={isDialogOpen}
				initialName={playerName}
				onClose={() => setIsDialogOpen(false)}
				onSave={handleSave}
			/>
		</>
	);
}
