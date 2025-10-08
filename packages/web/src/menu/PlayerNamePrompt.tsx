import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '../components/common/Button';
import { ShowcaseCard } from '../components/layouts/ShowcasePage';

const NAME_LABEL_CLASS = [
	'text-xs font-semibold uppercase tracking-[0.3em] text-slate-500',
	'dark:text-slate-300',
].join(' ');

const NAME_INPUT_CLASS = [
	'w-full rounded-full border border-white/60 bg-white/80 px-5 py-3 text-sm',
	'text-slate-900 shadow-inner shadow-slate-900/5 transition',
	'placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none',
	'focus:ring-2 focus:ring-emerald-200 dark:border-white/10',
	'dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500',
	'dark:shadow-black/30 dark:focus:border-emerald-300 dark:focus:ring-emerald-500/40',
].join(' ');

const ERROR_TEXT_CLASS = [
	'text-xs font-semibold text-rose-600 dark:text-rose-400',
].join(' ');

const DESCRIPTION_TEXT = [
	'Before we begin, tell us the name that will echo through your chronicles.',
	'This title can change later from the Settings menu.',
].join(' ');

export interface PlayerNamePromptProps {
	onSubmitName: (name: string) => void;
}

export function PlayerNamePrompt({ onSubmitName }: PlayerNamePromptProps) {
	const inputId = useId();
	const [name, setName] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const trimmed = name.trim();
	const hasError = submitted && trimmed.length === 0;
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitted(true);
		if (trimmed.length === 0) {
			return;
		}
		onSubmitName(trimmed);
	};
	return (
		<ShowcaseCard className="flex flex-col gap-6">
			<div className="flex flex-col gap-2 text-left">
				<span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
					Welcome, Sovereign
				</span>
				<h2 className="text-2xl font-bold tracking-tight">
					What shall your people call you?
				</h2>
				{/* prettier-ignore */}
				<p className="text-sm text-slate-600 dark:text-slate-300/80">
					{DESCRIPTION_TEXT}
                                </p>
			</div>
			<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
				<label htmlFor={inputId} className={NAME_LABEL_CLASS}>
					Your Name
				</label>
				<input
					id={inputId}
					className={NAME_INPUT_CLASS}
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="Player"
					maxLength={40}
					autoFocus
				/>
				{hasError ? (
					<p className={ERROR_TEXT_CLASS}>Please enter a name to continue.</p>
				) : null}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Tip: a memorable title inspires loyalty.
					</p>
					<Button
						type="submit"
						variant="success"
						className="sm:w-auto"
						icon="✨"
					>
						Confirm Name
					</Button>
				</div>
			</form>
		</ShowcaseCard>
	);
}
