import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useId,
	useState,
} from 'react';
import Button from '../common/Button';
import { useGameEngine } from '../../state/GameContext';

const INPUT_FORM_CLASS = [
	'flex flex-col gap-4 rounded-2xl border border-white/20 bg-white/85 px-6 py-5',
	'shadow-inner shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900/80',
	'dark:shadow-black/30',
].join(' ');

const TITLE_CLASS = [
	'text-sm font-semibold uppercase tracking-wide text-slate-700',
	'dark:text-slate-200',
].join(' ');

const DESCRIPTION_CLASS = [
	'text-sm text-slate-600 dark:text-slate-300/80',
].join(' ');

const INPUT_FIELD_CLASS = [
	'w-full rounded-full border border-slate-300 bg-white/90 px-5 py-3 text-sm',
	'text-slate-900 shadow-inner shadow-slate-900/5 transition focus:border-emerald-400',
	'focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-white/10',
	'dark:bg-slate-900/85 dark:text-slate-100 dark:shadow-black/30',
	'dark:focus:border-emerald-300 dark:focus:ring-emerald-500/40',
].join(' ');

const STATUS_CLASS: Record<'idle' | 'success' | 'error', string> = {
	idle: 'hidden',
	success: 'text-xs font-semibold text-emerald-600 dark:text-emerald-400',
	error: 'text-xs font-semibold text-rose-600 dark:text-rose-400',
};

const NOTE_TEXT_CLASS = ['text-xs text-slate-500 dark:text-slate-400'].join(
	' ',
);

const ACTIONS_LAYOUT_CLASS = [
	'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
].join(' ');

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
	const { pushSuccessToast } = useGameEngine();
	const inputId = useId();
	const labelId = `${inputId}-label`;
	const [draftName, setDraftName] = useState(playerName);
	const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
	const [message, setMessage] = useState('');

	useEffect(() => {
		if (!open) {
			return;
		}
		setDraftName(playerName);
		setStatus('idle');
		setMessage('');
	}, [open, playerName]);

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		setDraftName(event.target.value);
		setStatus('idle');
		setMessage('');
	};

	const commitName = () => {
		const trimmed = draftName.trim();
		if (!trimmed) {
			setStatus('error');
			setMessage('Please enter a name.');
			return;
		}
		if (trimmed === playerName) {
			setStatus('success');
			setMessage('Name updated.');
			return;
		}
		onSave(trimmed);
		setStatus('success');
		setMessage('Name updated.');
		pushSuccessToast('Your title now echoes across the realm.', 'Name saved');
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		commitName();
	};

	const statusClass = STATUS_CLASS[status];

	return (
		<form className={INPUT_FORM_CLASS} onSubmit={handleSubmit} noValidate>
			<div className="flex flex-col gap-2 text-left">
				<h3 id={labelId} className={TITLE_CLASS}>
					Player name
				</h3>
				<p className={DESCRIPTION_CLASS}>
					This name appears across panels, logs, and history summaries.
				</p>
			</div>
			<input
				id={inputId}
				aria-labelledby={labelId}
				className={INPUT_FIELD_CLASS}
				value={draftName}
				onChange={handleChange}
				maxLength={40}
			/>
			<p
				className={statusClass}
				role={status === 'error' ? 'alert' : undefined}
			>
				{message}
			</p>
			<div className={ACTIONS_LAYOUT_CLASS}>
				<p className={NOTE_TEXT_CLASS}>
					Save to see your title echoed immediately across the realm.
				</p>
				<Button type="submit" variant="success" className="sm:w-auto" icon="💾">
					Save name
				</Button>
			</div>
		</form>
	);
}
